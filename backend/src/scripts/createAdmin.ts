import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User.model';
import Company from '../models/Company.model';
import { connectDatabase } from '../config/database';
import { USER_ROLES } from '../config/constants';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const createAdmin = async () => {
  try {
    // Connect to database
    await connectDatabase();
    console.log('Connected to database');

    const email = 'admin@troika.in';
    const password = 'admin@123';
    const firstName = 'Pratik';
    const lastName = 'Admin';

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('✅ Admin user already exists:', existingUser.email);
      console.log('Email:', existingUser.email);
      console.log('Name:', `${existingUser.profile.firstName} ${existingUser.profile.lastName}`);
      console.log('Role:', existingUser.role);
      console.log('ID:', existingUser._id);
      
      // Update password if needed
      if (existingUser.role !== USER_ROLES.SUPER_ADMIN) {
        existingUser.role = USER_ROLES.SUPER_ADMIN;
        existingUser.password = password; // Will be hashed by pre-save hook
        await existingUser.save();
        console.log('✅ Updated user role to super_admin and password');
      }
      
      process.exit(0);
    }

    // Create or find default company for admin
    let company = await Company.findOne({ name: 'Troika Admin Company' });
    if (!company) {
      company = await Company.create({
        name: 'Troika Admin Company',
        subscription: {
          plan: 'enterprise',
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          isActive: true,
        },
        settings: {
          maxUsers: 1000,
          features: {
            aiCoaching: true,
            voiceTraining: true,
            analytics: true,
          },
        },
      });
      console.log('✅ Created default company for admin');
    }

    // Admin user data
    const userData = {
      email,
      password, // Will be hashed by pre-save hook
      profile: {
        firstName,
        lastName,
        phone: '',
      },
      role: USER_ROLES.SUPER_ADMIN,
      companyId: company._id,
      isActive: true,
      isEmailVerified: true,
    };

    // Create admin user
    const user = await User.create(userData);

    console.log('\n✅ Admin user created successfully!');
    console.log('==========================================');
    console.log('Email:', user.email);
    console.log('Password: admin@123');
    console.log('Name:', `${user.profile.firstName} ${user.profile.lastName}`);
    console.log('Role:', user.role);
    console.log('User ID:', user._id);
    console.log('Company ID:', user.companyId);
    console.log('==========================================');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.errors) {
      console.error('Validation errors:', error.errors);
    }
    process.exit(1);
  }
};

createAdmin();

