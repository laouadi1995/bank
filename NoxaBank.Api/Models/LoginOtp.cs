using System.ComponentModel.DataAnnotations;

namespace NoxaBank.Api.Models
{
    public class LoginOtp
    {
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required, MaxLength(10)]
        public string OtpCode { get; set; } = string.Empty;

        [Required]
        public bool IsUsed { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Expire après 15 minutes
        public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddMinutes(15);
    }
}
