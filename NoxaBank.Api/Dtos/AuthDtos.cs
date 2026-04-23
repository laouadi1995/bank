using System.ComponentModel.DataAnnotations;

namespace NoxaBank.Api.Dtos;

public class SignUpDto
{
    [Required] public string FullName { get; set; } = string.Empty;
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;

    public string? Phone { get; set; }
    public string? PassportNumber { get; set; }
    public string? Address { get; set; }
    public DateTime? BirthDate { get; set; }

    [Required, MinLength(6)] public string Password { get; set; } = string.Empty;
}

public class SignInDto
{
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [Required] public string Password { get; set; } = string.Empty;
}

public class VerifyEmailDto
{
    [Required] public int UserId { get; set; }
    [Required, MaxLength(10)] public string VerificationCode { get; set; } = string.Empty;
}

public class VerifySignUpDto
{
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [Required, MaxLength(10)] public string VerificationCode { get; set; } = string.Empty;
}

public class ResendSignupCodeDto
{
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
}

public class ResendVerificationCodeDto
{
    [Required] public int UserId { get; set; }
}

public class VerifyLoginOtpDto
{
    [Required] public int UserId { get; set; }
    [Required, MaxLength(10)] public string OtpCode { get; set; } = string.Empty;
}

public class ResendLoginOtpDto
{
    [Required] public int UserId { get; set; }
}
