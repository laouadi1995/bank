using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NoxaBank.Api.Models
{
    public class BankAccount
    {
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        public User? User { get; set; }

        // "Main" ou "Savings"
        [Required, MaxLength(20)]
        public string Type { get; set; } = "Main";

        [Column(TypeName = "decimal(18,2)")]
        public decimal Balance { get; set; } = 0m;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
