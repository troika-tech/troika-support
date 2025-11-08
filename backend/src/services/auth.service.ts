import mongoose from 'mongoose';
import { User, Company, IUser } from '../models';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { UnauthorizedError, BadRequestError, NotFoundError } from '../utils/errors';
import { getRedisClient } from '../config/redis';
import logger from '../utils/logger';

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: 'super_admin' | 'manager' | 'sales_rep';
  companyId?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthResponse {
  user: any;
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        throw new BadRequestError('User with this email already exists');
      }

      // If no companyId provided, check if we need to create a default company
      let companyId = data.companyId;
      if (!companyId) {
        // For first user (super_admin), create a default company
        if (data.role === 'super_admin') {
          const company = await Company.create({
            name: 'Default Company',
            subscription: {
              plan: 'trial',
              startDate: new Date(),
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
              isActive: true,
            },
          });
          companyId = (company._id as mongoose.Types.ObjectId).toString();
        } else {
          throw new BadRequestError('Company ID is required for non-admin users');
        }
      }

      // Verify company exists if companyId is provided
      if (companyId) {
        const company = await Company.findById(companyId);
        if (!company) {
          throw new NotFoundError('Company not found');
        }

        // Check if company has reached max users
        const userCount = await User.countDocuments({ companyId, isActive: true });
        if (userCount >= company.settings.maxUsers) {
          throw new BadRequestError('Company has reached maximum user limit');
        }
      }

      // Create user
      const user = await User.create({
        email: data.email,
        password: data.password, // Will be hashed by pre-save hook
        role: data.role || 'sales_rep',
        profile: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
        },
        companyId,
      });

      // Generate tokens
      const accessToken = this.generateTokens(user).accessToken;
      const refreshToken = this.generateTokens(user).refreshToken;

      // Store refresh token in Redis (optional)
      await this.storeRefreshToken((user._id as mongoose.Types.ObjectId).toString(), refreshToken);

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      logger.info(`User registered: ${user.email}`);

      return {
        user: this.sanitizeUser(user),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(data: LoginData): Promise<AuthResponse> {
    try {
      // Find user with password
      const user = await User.findOne({ email: data.email }).select('+password');
      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedError('Account is deactivated. Please contact administrator.');
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(data.password);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Check company subscription if user has a companyId
      if (user.companyId) {
        const company = await Company.findById(user.companyId);
        if (!company || !company.isSubscriptionActive()) {
          throw new UnauthorizedError('Company subscription has expired');
        }
      }

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(user);

      // Store refresh token in Redis
      await this.storeRefreshToken((user._id as mongoose.Types.ObjectId).toString(), refreshToken);

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      logger.info(`User logged in: ${user.email}`);

      return {
        user: this.sanitizeUser(user),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Check if refresh token is stored in Redis
      const storedToken = await this.getStoredRefreshToken(decoded.userId);
      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      // Find user
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new UnauthorizedError('User not found or inactive');
      }

      // Generate new access token
      const accessToken = generateAccessToken({
        userId: (user._id as mongoose.Types.ObjectId).toString(),
        email: user.email,
        role: user.role,
        companyId: user.companyId?.toString() || '',
      });

      logger.info(`Access token refreshed for user: ${user.email}`);

      return { accessToken };
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string): Promise<void> {
    try {
      // Remove refresh token from Redis
      await this.removeRefreshToken(userId);

      logger.info(`User logged out: ${userId}`);
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(userId: string): Promise<any> {
    try {
      const user = await User.findById(userId)
        .populate('companyId', 'name logo')
        .populate('teamId', 'name')
        .populate('groupId', 'name sessionTime');

      if (!user) {
        throw new NotFoundError('User not found');
      }

      return this.sanitizeUser(user);
    } catch (error) {
      logger.error('Get current user error:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal if user exists
        logger.warn(`Password reset requested for non-existent email: ${email}`);
        return;
      }

      // TODO: Generate reset token and send email
      // For now, just log
      logger.info(`Password reset requested for: ${email}`);

      // In production, you would:
      // 1. Generate a secure random token
      // 2. Store it in Redis with expiration (e.g., 1 hour)
      // 3. Send email with reset link
    } catch (error) {
      logger.error('Password reset request error:', error);
      throw error;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(_token: string, _newPassword: string): Promise<void> {
    try {
      // TODO: Verify reset token from Redis
      // TODO: Update user password
      // TODO: Remove reset token from Redis

      logger.info('Password reset completed');
    } catch (error) {
      logger.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private generateTokens(user: IUser): { accessToken: string; refreshToken: string } {
    const payload = {
      userId: (user._id as mongoose.Types.ObjectId).toString(),
      email: user.email,
      role: user.role,
      companyId: user.companyId?.toString() || '',
    };

    return {
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload),
    };
  }

  /**
   * Store refresh token in Redis
   */
  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const key = `refresh_token:${userId}`;
      const ttl = 7 * 24 * 60 * 60; // 7 days in seconds

      await redis.set(key, token, { EX: ttl });
    } catch (error) {
      // Log error but don't throw - Redis is optional
      logger.error('Failed to store refresh token in Redis:', error);
    }
  }

  /**
   * Get stored refresh token from Redis
   */
  private async getStoredRefreshToken(userId: string): Promise<string | null> {
    try {
      const redis = getRedisClient();
      const key = `refresh_token:${userId}`;
      return await redis.get(key);
    } catch (error) {
      logger.error('Failed to get refresh token from Redis:', error);
      return null;
    }
  }

  /**
   * Remove refresh token from Redis
   */
  private async removeRefreshToken(userId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const key = `refresh_token:${userId}`;
      await redis.del(key);
    } catch (error) {
      logger.error('Failed to remove refresh token from Redis:', error);
    }
  }

  /**
   * Sanitize user data (remove sensitive fields)
   */
  private sanitizeUser(user: any): any {
    const sanitized = user.toObject ? user.toObject() : user;
    delete sanitized.password;
    delete sanitized.__v;
    return sanitized;
  }
}

export default new AuthService();
