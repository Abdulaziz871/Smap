import connectDB from '../../../../lib/mongodb.js';
import { User } from '../../../../models/User.js';
import bcrypt from 'bcryptjs';
import { initializeSocialMediaTypes } from '../../../../utils/database.js';

export async function POST(request) {
  try {
    await connectDB();
    await initializeSocialMediaTypes(); // Initialize default data
    
    const { userName, email, password, firstName, lastName } = await request.json();

    // Validate input
    if (!userName || !email || !password) {
      return Response.json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { userName }]
    });

    if (existingUser) {
      return Response.json(
        { error: 'User with this email or username already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      userName,
      email,
      password: hashedPassword,
      firstName: firstName || '',
      lastName: lastName || ''
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user.toObject();

    return Response.json(
      { 
        message: 'User created successfully',
        user: userWithoutPassword
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
