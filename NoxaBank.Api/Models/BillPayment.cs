using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NoxaBank.Api.Models
{
    public class BillPayment
    {
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required, MaxLength(100)]
        public string Provider { get; set; } = string.Empty; // Bell, Collège la cité, Université, etc.

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [Required, MaxLength(20)]
        public string AccountType { get; set; } = "main"; // "main", "savings", "credit"

        [Required, MaxLength(20)]
        public string Status { get; set; } = "pending"; // "pending", "completed", "cancelled"

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? CancelledAt { get; set; } // Pour pouvoir annuler dans les 48h
    }
}
