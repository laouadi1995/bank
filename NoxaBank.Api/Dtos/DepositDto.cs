namespace NoxaBank.Api.Dtos;

public class DepositDto
{
    public string PassportNumber { get; set; } = string.Empty;

    public string AccountType { get; set; } = string.Empty; 
    // "Main" or "Savings"

    public string DepositType { get; set; } = string.Empty; 
    // "Cash" or "Cheque"

    public decimal Amount { get; set; }

    // Cheque only
    public string? Supplier { get; set; }
    public DateTime? DepositDate { get; set; }
    public DateTime? ChequeDate { get; set; }
}
