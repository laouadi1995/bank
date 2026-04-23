using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NoxaBank.Api.Models
{
    public class OperationLog
    {
        public int Id { get; set; }

        [Required, MaxLength(20)]
        public string Type { get; set; } = "Transfer"; // "Transfer" | "Deposit"

        // ✅ Pour transfer : SenderUserId + RecipientUserId
        public int? SenderUserId { get; set; }
        public int RecipientUserId { get; set; }

        // ✅ Pour deposit : DepositMethod = "cash" | "cheque"
        [MaxLength(20)]
        public string? DepositMethod { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
