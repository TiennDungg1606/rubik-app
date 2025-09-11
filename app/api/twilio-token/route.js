// rubik-app/app/api/twilio-token/route.js
import { NextResponse } from 'next/server';
import { AccessToken } from 'twilio-jwt';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_API_SECRET = process.env.TWILIO_API_SECRET;

export async function POST(request) {
  try {
    const { userId, roomName } = await request.json();

    console.log('Twilio token request:', { userId, roomName });

    if (!userId || !roomName) {
      console.log('Missing userId or roomName');
      return NextResponse.json(
        { error: 'userId and roomName are required' },
        { status: 400 }
      );
    }

    console.log('Twilio credentials check:', {
      hasAccountSid: !!TWILIO_ACCOUNT_SID,
      hasApiSecret: !!TWILIO_API_SECRET
    });

    if (!TWILIO_ACCOUNT_SID || !TWILIO_API_SECRET) {
      console.log('Twilio credentials not configured');
      return NextResponse.json(
        { error: 'Twilio credentials not configured' },
        { status: 500 }
      );
    }

    // Create access token using twilio-jwt
    const token = new AccessToken(
      TWILIO_ACCOUNT_SID,
      TWILIO_API_SECRET,
      { identity: userId }
    );

    // Grant video access
    const videoGrant = new AccessToken.VideoGrant({
      room: roomName,
    });
    token.addGrant(videoGrant);

    return NextResponse.json({
      token: token.toJwt(),
      roomName: roomName,
    });
  } catch (error) {
    console.error('Error generating Twilio token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token', details: error.message },
      { status: 500 }
    );
  }
}