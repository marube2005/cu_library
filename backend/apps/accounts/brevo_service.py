import os
from django.core.mail import send_mail


def send_otp_email(user, otp: str) -> bool:
    """Sends a styled 6-digit OTP verification email via Brevo SMTP relay.
    Always logs OTP to console for developer testing.
    """
    from_email = os.getenv('DEFAULT_FROM_EMAIL', 'CU Library <no-reply@culibrary.org>')
    subject = 'Your CU Library Verification Code'

    html = (
        '<!DOCTYPE html><html><head><meta charset=utf-8><style>'
        'body{font-family:-apple-system,sans-serif;background:#f8fafc;margin:0;padding:24px}'
        '.c{max-width:480px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:36px 32px}'
        '.h{text-align:center;margin-bottom:24px}'
        '.t{font-size:20px;font-weight:800;color:#0f172a;margin:4px 0 0}'
        '.s{font-size:13px;color:#64748b;margin-top:2px}'
        '.p{font-size:14px;line-height:1.6;color:#475569;margin:12px 0}'
        '.otp{background:#0f172a;border-radius:12px;padding:24px 16px;text-align:center;margin:24px 0}'
        '.ol{font-size:10px;color:#94a3b8;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px}'
        f'.oc{{font-size:46px;font-weight:900;color:#f59e0b;letter-spacing:10px;font-family:monospace}}'
        '.ex{font-size:12px;color:#64748b;text-align:center;margin:-8px 0 16px}'
        '.f{font-size:12px;color:#94a3b8;text-align:center;margin-top:24px;border-top:1px solid #f1f5f9;padding-top:16px}'
        '</style></head><body><div class=c>'
        '<div class=h><div style=font-size:32px>&#10011;</div>'
        '<p class=t>Christian Union Library</p><p class=s>Email Verification</p></div>'
        f'<p class=p>Hello <strong>{user.full_name}</strong>,</p>'
        '<p class=p>Use the 6-digit code below to verify your email and activate your CU Library account.</p>'
        f'<div class=otp><div class=ol>Verification Code</div><div class=oc>{otp}</div></div>'
        '<p class=ex>&#9201; Expires in <strong>10 minutes</strong></p>'
        '<p class=p style=font-size:12px;color:#94a3b8>If you did not sign up, ignore this email.</p>'
        '<div class=f>Blessings,<br>CU Library &amp; Literature Ministry Team</div>'
        '</div></body></html>'
    )

    text = f'Your CU Library verification code is: {otp}\n\nExpires in 10 minutes.'

    try:
        send_mail(
            subject=subject,
            message=text,
            from_email=from_email,
            recipient_list=[user.email],
            html_message=html,
            fail_silently=False,
        )
    except Exception as e:
        print(f'\n[OTP EMAIL - SMTP Error]: {e}')

    sep = '=' * 60
    print(f'\n{sep}')
    print(f'[OTP EMAIL] -> {user.full_name} <{user.email}>')
    print(f'  Code: {otp}   (valid for 10 minutes)')
    print(f'{sep}\n')
    return True

