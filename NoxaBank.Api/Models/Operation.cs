using System.ComponentModel.DataAnnotations;

namespace NoxaBank.Api.Models
{
    public class Operation
    {
        public int Id { get; set; }

        [Required, MaxLength(20)]
        public string Type { get; set; } = "transfer"; // transfer | deposit

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Pour transfert
        public int? SenderUserId { get; set; }
        public int? RecipientUserId { get; set; }

        // Pour dépôt (cash/cheque)
        [MaxLength(20)]
        public string? DepositMethod { get; set; } // cash | cheque

        public decimal Amount { get; set; }

        // Redondance utile pour affichage rapide
        public string? SenderFullName { get; set; }
        public string? RecipientFullName { get; set; }
    }
}
