import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User.model';
import { connectDatabase } from '../config/database';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const createUser = async () => {
  try {
    // Connect to database
    await connectDatabase();
    console.log('Connected to database');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'pratik.yesare68@gmail.com' });
    if (existingUser) {
      console.log('✅ User already exists:', existingUser.email);
      console.log('Email:', existingUser.email);
      console.log('Name:', `${existingUser.profile.firstName} ${existingUser.profile.lastName}`);
      console.log('Role:', existingUser.role);
      console.log('ID:', existingUser._id);
      process.exit(0);
    }

    // User data
    const userData = {
      email: 'pratik.yesare68@gmail.com',
      password: 'Pratik@2001',
      profile: {
        firstName: 'Pratik',
        lastName: 'Yesare',
        phone: '',
      },
      role: 'sales_rep' as const,
      isActive: true,
      isEmailVerified: true,
    };

    // Create new user
    const user = await User.create(userData);

    console.log('\n✅ User created successfully!');
    console.log('==========================================');
    console.log('Email:', user.email);
    console.log('Password: Pratik@2001');
    console.log('Name:', `${user.profile.firstName} ${user.profile.lastName}`);
    console.log('Role:', user.role);
    console.log('User ID:', user._id);
    console.log('==========================================');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating user:', error);
    process.exit(1);
  }
};

createUser();
