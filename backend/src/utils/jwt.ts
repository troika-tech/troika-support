import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  companyId: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  const expiresIn = (process.env.REFRESH_TOKEN_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET!, { expiresIn });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};
