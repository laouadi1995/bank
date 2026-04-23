using System.ComponentModel.DataAnnotations;

namespace NoxaBank.Api.Models
{
    public class EmailVerification
    {
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required, MaxLength(10)]
        public string VerificationCode { get; set; } = string.Empty;

        [Required]
        public bool IsVerified { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? VerifiedAt { get; set; }

        // Expire après 24 heures
        public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddHours(24);
    }
}
