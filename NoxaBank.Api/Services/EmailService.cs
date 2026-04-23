using System.Net;
using System.Net.Mail;

namespace NoxaBank.Api.Services
{
    public interface IEmailService
    {
        Task SendVerificationEmailAsync(string recipientEmail, string fullName, string verificationCode);
        Task SendTransferNotificationAsync(string recipientEmail, string recipientName, string senderName, decimal amount, string bankName);
        Task SendEmailAsync(string recipientEmail, string subject, string htmlBody);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration config, ILogger<EmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task SendVerificationEmailAsync(string recipientEmail, string fullName, string verificationCode)
        {
            try
            {
                var smtpServer = _config["EmailSettings:SmtpServer"] ?? "smtp.gmail.com";
                var smtpPort = int.Parse(_config["EmailSettings:SmtpPort"] ?? "587");
                var senderEmail = _config["EmailSettings:SenderEmail"] ?? "noxabank@gmail.com";
                var senderPassword = _config["EmailSettings:SenderPassword"] ?? "";
                var bankName = _config["EmailSettings:BankName"] ?? "NoxaBank";

                // Pour la démo, on va juste logger le code
                if (string.IsNullOrWhiteSpace(senderPassword))
                {
                    _logger.LogInformation(
                        $"[EMAIL VERIFICATION] To: {recipientEmail}, Code: {verificationCode}, Name: {fullName}");
                    return;
                }

                using (var client = new SmtpClient(smtpServer, smtpPort))
                {
                    client.EnableSsl = true;
                    client.Credentials = new NetworkCredential(senderEmail, senderPassword);

                    var emailBody = GenerateEmailBody(fullName, verificationCode, bankName);

                    var mailMessage = new MailMessage
                    {
                        From = new MailAddress(senderEmail, bankName),
                        Subject = $"{bankName} - Confirm your email address",
                        Body = emailBody,
                        IsBodyHtml = true
                    };

                    mailMessage.To.Add(recipientEmail);

                    await client.SendMailAsync(mailMessage);

                    _logger.LogInformation($"Verification email sent to {recipientEmail}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error sending email to {recipientEmail}: {ex.Message}");
                throw;
            }
        }

        public async Task SendTransferNotificationAsync(string recipientEmail, string recipientName, string senderName, decimal amount, string bankName)
        {
            try
            {
                var smtpServer = _config["EmailSettings:SmtpServer"] ?? "smtp.gmail.com";
                var smtpPort = int.Parse(_config["EmailSettings:SmtpPort"] ?? "587");
                var senderEmail = _config["EmailSettings:SenderEmail"] ?? "noxabank@gmail.com";
                var senderPassword = _config["EmailSettings:SenderPassword"] ?? "";
                var bankNameConfig = _config["EmailSettings:BankName"] ?? "NoxaBank";

                // Pour la démo, on va juste logger l'email
                if (string.IsNullOrWhiteSpace(senderPassword))
                {
                    _logger.LogInformation(
                        $"[EMAIL TRANSFER] To: {recipientEmail}, From: {senderName}, Amount: {amount}, Recipient: {recipientName}");
                    return;
                }

                using (var client = new SmtpClient(smtpServer, smtpPort))
                {
                    client.EnableSsl = true;
                    client.Credentials = new NetworkCredential(senderEmail, senderPassword);

                    var emailBody = GenerateTransferNotificationBody(recipientName, senderName, amount, bankNameConfig);

                    var mailMessage = new MailMessage
                    {
                        From = new MailAddress(senderEmail, bankNameConfig),
                        Subject = $"💰 {bankNameConfig} - Transfer Notification: {amount:F2}",
                        Body = emailBody,
                        IsBodyHtml = true
                    };

                    mailMessage.To.Add(recipientEmail);

                    await client.SendMailAsync(mailMessage);

                    _logger.LogInformation($"Transfer notification email sent to {recipientEmail}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error sending transfer notification to {recipientEmail}: {ex.Message}");
            }
        }

        public async Task SendEmailAsync(string recipientEmail, string subject, string htmlBody)
        {
            try
            {
                var smtpServer = _config["EmailSettings:SmtpServer"] ?? "smtp.gmail.com";
                var smtpPort = int.Parse(_config["EmailSettings:SmtpPort"] ?? "587");
                var senderEmail = _config["EmailSettings:SenderEmail"] ?? "noxabank@gmail.com";
                var senderPassword = _config["EmailSettings:SenderPassword"] ?? "";
                var bankNameConfig = _config["EmailSettings:BankName"] ?? "NoxaBank";

                // Pour la démo, on va juste logger l'email
                if (string.IsNullOrWhiteSpace(senderPassword))
                {
                    _logger.LogInformation($"[EMAIL] To: {recipientEmail}, Subject: {subject}");
                    return;
                }

                using (var client = new SmtpClient(smtpServer, smtpPort))
                {
                    client.EnableSsl = true;
                    client.Credentials = new NetworkCredential(senderEmail, senderPassword);

                    var mailMessage = new MailMessage
                    {
                        From = new MailAddress(senderEmail, bankNameConfig),
                        Subject = subject,
                        Body = htmlBody,
                        IsBodyHtml = true
                    };

                    mailMessage.To.Add(recipientEmail);
                    await client.SendMailAsync(mailMessage);

                    _logger.LogInformation($"Email sent to {recipientEmail}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error sending email to {recipientEmail}: {ex.Message}");
            }
        }

        private string GenerateTransferNotificationBody(string recipientName, string senderName, decimal amount, string bankName)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }}
        .container {{ max-width: 600px; margin: 20px auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }}
        .header h1 {{ margin: 0; font-size: 28px; }}
        .header p {{ margin: 10px 0 0 0; font-size: 14px; }}
        .content {{ padding: 30px; }}
        .content p {{ margin: 0 0 15px 0; color: #333; font-size: 14px; line-height: 1.6; }}
        .amount-box {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; margin: 25px 0; text-align: center; border-radius: 8px; }}
        .amount-box .label {{ font-size: 12px; opacity: 0.9; }}
        .amount-box .amount {{ font-size: 36px; font-weight: bold; margin-top: 10px; }}
        .info-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        .info-table td {{ padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }}
        .info-table td.label {{ font-weight: bold; width: 35%; background-color: #f9f9f9; }}
        .info-table td.value {{ color: #555; }}
        .footer {{ background-color: #f9f9f9; padding: 20px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; }}
        .success-badge {{ display: inline-block; background-color: #51cf66; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; margin-bottom: 15px; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>💰 {bankName}</h1>
            <p>Transfer Notification</p>
        </div>
        <div class=""content"">
            <div class=""success-badge"">✅ Transfer Received Successfully</div>
            <p>Hello <strong>{recipientName}</strong>,</p>
            <p>Great news! You have received a transfer. Here are the details:</p>
            
            <div class=""amount-box"">
                <div class=""label"">AMOUNT RECEIVED</div>
                <div class=""amount"">{amount:F2} MAD</div>
            </div>
            
            <table class=""info-table"">
                <tr>
                    <td class=""label"">From:</td>
                    <td class=""value"">{senderName}</td>
                </tr>
                <tr>
                    <td class=""label"">To Account:</td>
                    <td class=""value"">Main Account</td>
                </tr>
                <tr>
                    <td class=""label"">Date & Time:</td>
                    <td class=""value"">{DateTime.UtcNow:dd/MM/yyyy HH:mm:ss}</td>
                </tr>
                <tr>
                    <td class=""label"">Bank:</td>
                    <td class=""value"">{bankName}</td>
                </tr>
            </table>
            
            <p style=""margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 13px;"">
                Your transfer has been processed successfully and credited to your Main Account. You can log in to your {bankName} account to view your updated balance and transaction history.
            </p>
        </div>
        <div class=""footer"">
            <p>© {DateTime.Now.Year} {bankName}. All rights reserved.</p>
            <p>This is an automated message, please do not reply directly to this email.</p>
        </div>
    </div>
</body>
</html>";
        }

        private string GenerateEmailBody(string fullName, string verificationCode, string bankName)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }}
        .container {{ max-width: 600px; margin: 20px auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }}
        .header h1 {{ margin: 0; font-size: 28px; }}
        .content {{ padding: 30px; }}
        .content p {{ margin: 0 0 15px 0; color: #333; font-size: 14px; }}
        .code-box {{ background-color: #f0f4ff; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; text-align: center; }}
        .code-box .code {{ font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #667eea; font-family: 'Courier New', monospace; }}
        .footer {{ background-color: #f9f9f9; padding: 20px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; }}
        .button {{ display: inline-block; background-color: #667eea; color: white; padding: 12px 30px; border-radius: 4px; text-decoration: none; margin-top: 15px; font-weight: bold; }}
        .warning {{ color: #ff6b6b; font-size: 12px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>{bankName}</h1>
            <p>Email Verification</p>
        </div>
        <div class=""content"">
            <p>Hello <strong>{fullName}</strong>,</p>
            <p>Welcome to {bankName}! To complete your account registration, please verify your email address by entering the code below.</p>
            <div class=""code-box"">
                <p style=""margin: 0 0 10px 0; color: #999; font-size: 12px;"">YOUR VERIFICATION CODE</p>
                <div class=""code"">{verificationCode}</div>
            </div>
            <p>This code will expire in <strong>24 hours</strong>. If you didn't create this account, please ignore this email.</p>
            <p style=""margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;"">
                <strong>Security reminder:</strong> Never share this code with anyone. {bankName} staff will never ask you for this code.
            </p>
        </div>
        <div class=""footer"">
            <p>© {DateTime.Now.Year} {bankName}. All rights reserved.</p>
            <p>This is an automated message, please do not reply directly to this email.</p>
        </div>
    </div>
</body>
</html>";
        }
    }
}
