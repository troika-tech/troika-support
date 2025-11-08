import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User.model';
import Company from '../models/Company.model';
import { connectDatabase } from '../config/database';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const cleanAndRecreateUser = async () => {
  try {
    // Connect to database
    await connectDatabase();
    console.log('Connected to database');

    // Delete existing user
    const deletedUser = await User.findOneAndDelete({ email: 'pratik.yesare68@gmail.com' });
    if (deletedUser) {
      console.log('Deleted existing user:', deletedUser.email);
    }

    // Delete company if it exists
    const deletedCompany = await Company.findOneAndDelete({ name: 'Troika Tech' });
    if (deletedCompany) {
      console.log('Deleted company:', deletedCompany.name);
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
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

cleanAndRecreateUser();
