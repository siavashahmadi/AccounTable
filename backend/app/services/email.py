import os
import sendgrid
from sendgrid.helpers.mail import Mail, Email, To, Content
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from ..core.config import get_settings
import logging
from typing import Optional

logger = logging.getLogger(__name__)

async def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """
    Send an email using SendGrid
    
    Args:
        to_email: The recipient's email address
        subject: The email subject
        html_content: The HTML content of the email
        
    Returns:
        True if the email was sent successfully, False otherwise
    """
    settings = get_settings()
    
    try:
        # Initialize SendGrid client with API key
        sg = sendgrid.SendGridAPIClient(api_key=settings.SMTP_PASSWORD)
        
        # Create the email
        message = Mail(
            from_email=settings.SENDER_EMAIL,
            to_emails=to_email,
            subject=subject,
            html_content=html_content
        )
        
        # Send email and get response
        response = sg.client.mail.send.post(request_body=message.get())
        
        if response.status_code in [200, 201, 202]:
            logger.info(f"Successfully sent email to {to_email}, status code: {response.status_code}")
            return True
        else:
            logger.error(f"Failed to send email. Status code: {response.status_code}")
            return False
            
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False


async def send_partnership_invitation_email(
    to_email: str, 
    inviter_name: str, 
    invitation_token: str,
    message: str = ""
) -> bool:
    """
    Send an email inviting a new user to join the app and become an accountability partner
    
    Args:
        to_email: The recipient's email address
        inviter_name: The name of the user sending the invitation
        invitation_token: The unique token for this invitation
        message: An optional message from the inviter
        
    Returns:
        True if the email was sent successfully, False otherwise
    """
    settings = get_settings()
    invitation_link = f"{settings.FRONTEND_URL}/register?invitation={invitation_token}"
    
    subject = f"{inviter_name} wants to be your accountability partner on {settings.APP_NAME}"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">You've been invited to {settings.APP_NAME}!</h2>
        <p>{inviter_name} wants you to be their accountability partner to help them achieve their goals.</p>
        
        {f'<div style="padding: 15px; border-left: 3px solid #ddd; margin: 20px 0;"><p><em>"{message}"</em></p></div>' if message else ''}
        
        <p>What is {settings.APP_NAME}?</p>
        <p>{settings.APP_NAME} helps people achieve their goals by pairing them with accountability partners who can provide support, motivation, and regular check-ins.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{invitation_link}" style="background-color: #4f46e5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Join {settings.APP_NAME}
            </a>
        </div>
        
        <p style="font-size: 0.9em; color: #666;">If you don't want to join, you can ignore this email. The invitation will expire in 7 days.</p>
    </div>
    """
    
    return await send_email(to_email, subject, html_content) 