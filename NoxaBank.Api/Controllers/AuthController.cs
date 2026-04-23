using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NoxaBank.Api.Data;
using NoxaBank.Api.Dtos;
using NoxaBank.Api.Models;
using NoxaBank.Api.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace NoxaBank.Api.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;
        private readonly PasswordHasher<User> _hasher = new();
        private readonly IEmailService _emailService;

        public AuthController(AppDbContext db, IConfiguration config, IEmailService emailService)
        {
            _db = db;
            _config = config;
            _emailService = emailService;
        }

        [HttpPost("signup")]
        public async Task<IActionResult> SignUp([FromBody] SignUpDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var email = dto.Email.Trim().ToLower();
            Console.WriteLine($"📝 SignUp attempt: email={email}");

            var phone = string.IsNullOrWhiteSpace(dto.Phone)
                ? null
                : NormalizePhone(dto.Phone);

            var passport = string.IsNullOrWhiteSpace(dto.PassportNumber)
                ? null
                : dto.PassportNumber.Trim().ToUpper();

            // 1) Email exists in Users?
            var emailExists = await _db.Users.AnyAsync(u => u.Email.ToLower() == email);
            if (emailExists)
            {
                Console.WriteLine($"❌ Email already exists in Users table");
                return Conflict(new { code = "EMAIL_EXISTS", message = "❌ Email already exists." });
            }

            // 2) Phone exists in Users?
            if (phone != null)
            {
                var phoneExists = await _db.Users.AnyAsync(u => u.Phone != null && u.Phone == phone);
                if (phoneExists)
                {
                    Console.WriteLine($"❌ Phone already exists in Users table");
                    return Conflict(new { code = "PHONE_EXISTS", message = "❌ Phone number already exists." });
                }
            }

            // 3) Passport exists in Users?
            if (passport != null)
            {
                var passportExists = await _db.Users.AnyAsync(u =>
                    u.PassportNumber != null && u.PassportNumber.ToUpper() == passport);

                if (passportExists)
                {
                    Console.WriteLine($"❌ Passport already exists in Users table");
                    return Conflict(new { code = "PASSPORT_EXISTS", message = "✅ You are already our client. Please sign in." });
                }
            }

            // 🎯 Ne crée PAS le compte tout de suite
            // Crée juste un enregistrement PendingSignUp en attente de vérification email
            
            // Supprimer les anciennes tentatives d'inscription non vérifiées pour cet email
            var oldPending = await _db.PendingSignUps
                .Where(p => p.Email == email && !p.IsVerified)
                .ToListAsync();
            _db.PendingSignUps.RemoveRange(oldPending);
            Console.WriteLine($"   Removed {oldPending.Count} old pending signups");

            // Générer code de vérification
            var verificationCode = GenerateVerificationCode();
            Console.WriteLine($"   Generated code: {verificationCode}");
            
            var pendingSignUp = new PendingSignUp
            {
                Email = email,
                FullName = dto.FullName.Trim(),
                Phone = phone,
                PassportNumber = passport,
                Address = string.IsNullOrWhiteSpace(dto.Address) ? null : dto.Address.Trim(),
                BirthDate = dto.BirthDate,
                VerificationCode = verificationCode,
                IsVerified = false,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddHours(24)
            };

            pendingSignUp.PasswordHash = _hasher.HashPassword(new User(), dto.Password);

            _db.PendingSignUps.Add(pendingSignUp);
            await _db.SaveChangesAsync();
            Console.WriteLine($"✅ PendingSignUp created with ID={pendingSignUp.Id}");

            // 🎯 Envoyer email
            try
            {
                await _emailService.SendVerificationEmailAsync(
                    email,
                    dto.FullName.Trim(),
                    verificationCode
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Email error: {ex.Message}");
            }

            return StatusCode(201, new
            {
                code = "CREATED",
                message = "✅ Verification code sent. Please check your email to verify your account.",
                email = email
            });
        }

        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.VerificationCode))
                return BadRequest(new { message = "Verification code is required." });

            // 🎯 Chercher dans PendingSignUp (nouveau workflow)
            if (dto.UserId == 0)
            {
                // Pour nouvelle inscription, email est requis dans le DTO
                // Ou on peut le déduire de sessionStorage au frontend
                return BadRequest(new { message = "Email is required for verification." });
            }

            // Chercher d'abord dans EmailVerification (ancien workflow)
            var emailVerification = await _db.EmailVerifications
                .FirstOrDefaultAsync(e =>
                    e.UserId == dto.UserId &&
                    e.VerificationCode == dto.VerificationCode &&
                    !e.IsVerified);

            if (emailVerification != null)
            {
                // Ancien workflow avec EmailVerification
                if (emailVerification.ExpiresAt < DateTime.UtcNow)
                    return BadRequest(new { message = "Verification code has expired. Please request a new one." });

                emailVerification.IsVerified = true;
                emailVerification.VerifiedAt = DateTime.UtcNow;

                var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == dto.UserId);
                if (user != null)
                {
                    user.IsActive = true;
                }

                await _db.SaveChangesAsync();

                return Ok(new
                {
                    message = "✅ Email verified successfully. Your account is now active. You can now sign in.",
                    code = "VERIFIED"
                });
            }

            // Si UserId=0, c'est une nouvelle inscription
            // Le frontend doit passer l'email
            return BadRequest(new { message = "Invalid verification code or user not found." });
        }

        [HttpPost("verify-signup")]
        public async Task<IActionResult> VerifySignUp([FromBody] VerifySignUpDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.VerificationCode))
                return BadRequest(new { message = "Email and verification code are required." });

            var email = dto.Email.Trim().ToLower();
            Console.WriteLine($"🔍 VerifySignUp: Looking for email={email}, code={dto.VerificationCode}");

            // 🎯 Chercher l'inscription en attente
            var pendingSignUp = await _db.PendingSignUps
                .FirstOrDefaultAsync(p =>
                    p.Email == email &&
                    p.VerificationCode == dto.VerificationCode &&
                    !p.IsVerified);

            if (pendingSignUp == null)
            {
                Console.WriteLine($"❌ PendingSignUp not found for email={email}");
                var allPending = await _db.PendingSignUps.Where(p => p.Email == email).ToListAsync();
                Console.WriteLine($"   Found {allPending.Count} pending signups for this email");
                foreach (var p in allPending)
                    Console.WriteLine($"   - IsVerified={p.IsVerified}, Code={p.VerificationCode}, ExpiredAt={p.ExpiresAt}");
                return BadRequest(new { message = "Invalid or expired verification code." });
            }

            Console.WriteLine($"✅ Found PendingSignUp: {pendingSignUp.Email}");
            Console.WriteLine($"   PendingSignUp.PasswordHash length: {pendingSignUp.PasswordHash?.Length ?? 0}");
            Console.WriteLine($"   PendingSignUp.PasswordHash: '{pendingSignUp.PasswordHash}'");

            if (pendingSignUp.ExpiresAt < DateTime.UtcNow)
            {
                Console.WriteLine($"⏰ Code expired at {pendingSignUp.ExpiresAt}");
                return BadRequest(new { message = "Verification code has expired. Please register again." });
            }

            // 🎯 Créer le compte utilisateur maintenant
            var user = new User
            {
                FullName = pendingSignUp.FullName,
                Email = pendingSignUp.Email,
                Phone = pendingSignUp.Phone,
                PhoneNumber = pendingSignUp.Phone,
                PassportNumber = pendingSignUp.PassportNumber,
                PassportId = pendingSignUp.PassportNumber,
                Address = pendingSignUp.Address,
                BirthDate = pendingSignUp.BirthDate,
                PasswordHash = pendingSignUp.PasswordHash,
                Role = "client",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                CreditBalance = 0m,
                MainBalance = 0m,
                SavingsBalance = 0m
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();
            Console.WriteLine($"✅ User created with ID={user.Id}, Email={user.Email}");

            // 🎯 Marquer PendingSignUp comme vérifié et supprimer
            pendingSignUp.IsVerified = true;
            pendingSignUp.VerifiedAt = DateTime.UtcNow;
            _db.PendingSignUps.Remove(pendingSignUp);
            await _db.SaveChangesAsync();
            Console.WriteLine($"✅ PendingSignUp removed");

            return Ok(new
            {
                message = "✅ Account verified successfully! Your account is now active. You can now sign in.",
                code = "VERIFIED",
                userId = user.Id
            });
        }

        [HttpPost("resend-signup-code")]
        public async Task<IActionResult> ResendSignupCode([FromBody] ResendSignupCodeDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email))
                return BadRequest(new { message = "Email is required." });

            var email = dto.Email.Trim().ToLower();

            var pendingSignUp = await _db.PendingSignUps
                .FirstOrDefaultAsync(p => p.Email == email && !p.IsVerified);

            if (pendingSignUp == null)
                return NotFound(new { message = "Signup not found. Please register again." });

            // Générer nouveau code
            var verificationCode = GenerateVerificationCode();
            pendingSignUp.VerificationCode = verificationCode;
            pendingSignUp.CreatedAt = DateTime.UtcNow;
            pendingSignUp.ExpiresAt = DateTime.UtcNow.AddHours(24);

            await _db.SaveChangesAsync();

            // Envoyer email
            try
            {
                await _emailService.SendVerificationEmailAsync(
                    email,
                    pendingSignUp.FullName,
                    verificationCode
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Email error: {ex.Message}");
            }

            return Ok(new
            {
                message = "✅ New verification code sent to your email.",
                code = "RESENT"
            });
        }

        public async Task<IActionResult> ResendVerificationCode([FromBody] ResendVerificationCodeDto dto)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == dto.UserId);
            if (user == null)
                return NotFound(new { message = "User not found." });

            // Supprimer les anciens codes
            var oldVerifications = await _db.EmailVerifications
                .Where(e => e.UserId == dto.UserId && !e.IsVerified)
                .ToListAsync();

            _db.EmailVerifications.RemoveRange(oldVerifications);

            // Générer nouveau code
            var verificationCode = GenerateVerificationCode();
            var emailVerification = new EmailVerification
            {
                UserId = user.Id,
                VerificationCode = verificationCode,
                IsVerified = false,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddHours(24)
            };

            _db.EmailVerifications.Add(emailVerification);
            await _db.SaveChangesAsync();

            // Envoyer email
            try
            {
                await _emailService.SendVerificationEmailAsync(
                    user.Email,
                    user.FullName,
                    verificationCode
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Email error: {ex.Message}");
            }

            return Ok(new
            {
                message = "✅ New verification code sent to your email.",
                code = "RESENT"
            });
        }

        private string GenerateVerificationCode()
        {
            var random = new Random();
            return random.Next(100000, 999999).ToString();
        }

        [HttpPost("signin")]
        public async Task<IActionResult> SignIn([FromBody] SignInDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var email = dto.Email.Trim().ToLower();
            Console.WriteLine($"🔐 SignIn attempt: email={email}");

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);
            if (user is null)
            {
                Console.WriteLine($"❌ User not found for email={email}");
                var allUsers = await _db.Users.Select(u => u.Email).ToListAsync();
                Console.WriteLine($"   Available emails in DB: {string.Join(", ", allUsers)}");
                return Unauthorized(new { message = "❌ Invalid email or password." });
            }

            Console.WriteLine($"✅ User found: {user.Email}, IsActive={user.IsActive}");
            Console.WriteLine($"   PasswordHash length: {(user.PasswordHash?.Length ?? 0)}");
            Console.WriteLine($"   PasswordHash value: '{user.PasswordHash}'");

            var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password);
            Console.WriteLine($"   VerifyResult: {result}");
            if (result == PasswordVerificationResult.Failed)
            {
                Console.WriteLine($"❌ Password verification failed");
                return Unauthorized(new { message = "❌ Invalid email or password." });
            }

            Console.WriteLine($"✅ Password verified successfully");

            if (!user.IsActive)
            {
                Console.WriteLine($"❌ Account not active");
                return Unauthorized(new { message = "❌ Your account is not activated. Please verify your email first." });
            }

            // 🎯 Générer code OTP pour 2FA
            var otpCode = GenerateVerificationCode();
            var loginOtp = new LoginOtp
            {
                UserId = user.Id,
                OtpCode = otpCode,
                IsUsed = false,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddMinutes(15)
            };

            _db.LoginOtps.Add(loginOtp);
            await _db.SaveChangesAsync();
            Console.WriteLine($"✅ OTP generated: {otpCode}");

            // 🎯 Envoyer OTP par email
            try
            {
                await _emailService.SendVerificationEmailAsync(
                    email,
                    user.FullName,
                    otpCode
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Email error: {ex.Message}");
            }

            return Ok(new
            {
                code = "OTP_SENT",
                message = "✅ OTP code sent to your email. Please verify to complete login.",
                userId = user.Id,
                email = email
            });
        }

        [HttpPost("verify-login-otp")]
        public async Task<IActionResult> VerifyLoginOtp([FromBody] VerifyLoginOtpDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.OtpCode))
                return BadRequest(new { message = "OTP code is required." });

            var loginOtp = await _db.LoginOtps
                .FirstOrDefaultAsync(o =>
                    o.UserId == dto.UserId &&
                    o.OtpCode == dto.OtpCode &&
                    !o.IsUsed);

            if (loginOtp == null)
                return BadRequest(new { message = "Invalid or expired OTP code." });

            if (loginOtp.ExpiresAt < DateTime.UtcNow)
                return BadRequest(new { message = "OTP code has expired. Please request a new one." });

            // ✅ Marquer OTP comme utilisé
            loginOtp.IsUsed = true;

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == dto.UserId);
            if (user == null)
                return NotFound(new { message = "User not found." });

            await _db.SaveChangesAsync();

            // ✅ Générer le JWT token
            var role = string.IsNullOrWhiteSpace(user.Role) ? "client" : user.Role.ToLower();
            var token = CreateJwt(user, role);

            return Ok(new
            {
                message = "✅ Login successful",
                token,
                user = new
                {
                    id = user.Id,
                    fullName = user.FullName,
                    email = user.Email,
                    role = role
                }
            });
        }

        [HttpPost("resend-login-otp")]
        public async Task<IActionResult> ResendLoginOtp([FromBody] ResendLoginOtpDto dto)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == dto.UserId);
            if (user == null)
                return NotFound(new { message = "User not found." });

            // Supprimer les anciens OTP non utilisés
            var oldOtps = await _db.LoginOtps
                .Where(o => o.UserId == dto.UserId && !o.IsUsed)
                .ToListAsync();

            _db.LoginOtps.RemoveRange(oldOtps);

            // Générer nouveau OTP
            var otpCode = GenerateVerificationCode();
            var loginOtp = new LoginOtp
            {
                UserId = user.Id,
                OtpCode = otpCode,
                IsUsed = false,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddMinutes(15)
            };

            _db.LoginOtps.Add(loginOtp);
            await _db.SaveChangesAsync();

            // Envoyer OTP
            try
            {
                await _emailService.SendVerificationEmailAsync(
                    user.Email,
                    user.FullName,
                    otpCode
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Email error: {ex.Message}");
            }

            return Ok(new
            {
                message = "✅ New OTP code sent to your email.",
                code = "OTP_RESENT"
            });
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            var userIdStr = User.FindFirstValue(JwtRegisteredClaimNames.Sub);

            if (string.IsNullOrWhiteSpace(userIdStr))
                return Unauthorized(new { message = "Token invalid (sub not found)." });

            if (!int.TryParse(userIdStr, out var userId))
                return Unauthorized(new { message = "Token invalid (sub not int)." });

            var user = await _db.Users
                .Where(u => u.Id == userId)
                .Select(u => new
                {
                    id = u.Id,
                    fullName = u.FullName,
                    email = u.Email,
                    phone = u.Phone,
                    passportNumber = u.PassportNumber
                })
                .FirstOrDefaultAsync();

            if (user == null)
                return NotFound(new { message = "User not found." });

            return Ok(user);
        }

      private string CreateJwt(User user, string role)
{
    var key = _config["Jwt:Key"]!;
    var issuer = _config["Jwt:Issuer"]!;
    var audience = _config["Jwt:Audience"]!;

    var claims = new List<Claim>
    {
        new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
        new Claim(JwtRegisteredClaimNames.Email, user.Email),
        new Claim("fullName", user.FullName),
        new Claim(ClaimTypes.Role, role) // ✅ IMPORTANT
    };

    var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
    var creds = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

    var token = new JwtSecurityToken(
        issuer: issuer,
        audience: audience,
        claims: claims,
        expires: DateTime.UtcNow.AddHours(2),
        signingCredentials: creds
    );

    return new JwtSecurityTokenHandler().WriteToken(token);
}

        private static string NormalizePhone(string input)
        {
            var digits = new string(input.Where(char.IsDigit).ToArray());
            return string.IsNullOrWhiteSpace(digits) ? input.Trim() : digits;
        }
    }
}
