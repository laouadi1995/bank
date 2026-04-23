using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NoxaBank.Api.Data;
using NoxaBank.Api.Models;
using NoxaBank.Api.Services;
using System.Security.Claims;
using BCrypt.Net;
namespace NoxaBank.Api.Controllers.Customer;

/*
================================================================================
ClientDashboardController.cs

Ce contrôleur gère toutes les opérations du côté client dans l’application
NoxaBank.

Fonctionnalités principales :

1. Dashboard
   - Récupération des informations du client connecté (nom, email, soldes)
   - Affichage des balances : Main, Savings, Credit

2. Dépôt (Deposit)
   - Dépôt par chèque uniquement
   - Validation des données (montant, dates, fournisseur)
   - Vérification : chèque ≤ 30 jours
   - Mise à jour du solde dans la base de données
   - Enregistrement dans l’historique (Operations)

3. Transfert
   a) Vers un autre client
      - Recherche du destinataire par Passport ID
      - Vérification du solde
      - Déduction du compte expéditeur
      - Ajout au Main Balance du destinataire
      - Historique (transfer-out / transfer-in)

   b) Entre ses propres comptes
      - Transfert entre Main, Savings, Credit
      - Vérification du solde
      - Historique (internal-transfer)

4. Historique
   - Récupération des transactions du client
   - Tri par date (plus récent en premier)

5. Profil (Update Profile)
   - Modification des informations :
     FullName, Email, Phone, Address, BirthDate
   - Changement du mot de passe (hash avec BCrypt)
   - Vérification unicité email

6. Sécurité
   - Authentification obligatoire (JWT)
   - Récupération du client via le token (email)

Technologies utilisées :
- ASP.NET Core Web API
- Entity Framework Core
- SQL Server
- JWT Authentication

================================================================================
*/


[ApiController]
[Route("api/client/dashboard")]
[Authorize]
public class ClientDashboardController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEmailService _emailService;

    public ClientDashboardController(AppDbContext db, IEmailService emailService)
    {
        _db = db;
        _emailService = emailService;
    }

    private string? GetCurrentUserEmail()
    {
        return User?.Claims.FirstOrDefault(c =>
                   c.Type == ClaimTypes.Email ||
                   c.Type == "email")?.Value;
    }

    private decimal GetBalanceByAccount(User user, string accountType)
    {
        return accountType switch
        {
            "main" => user.MainBalance,
            "savings" => user.SavingsBalance,
            "credit" => user.CreditBalance,
            _ => 0
        };
    }

    private void AddBalance(User user, string accountType, decimal amount)
    {
        switch (accountType)
        {
            case "main":
                user.MainBalance += amount;
                break;
            case "savings":
                user.SavingsBalance += amount;
                break;
            case "credit":
                user.CreditBalance += amount;
                break;
        }
    }

    private void SubtractBalance(User user, string accountType, decimal amount)
    {
        switch (accountType)
        {
            case "main":
                user.MainBalance -= amount;
                break;
            case "savings":
                user.SavingsBalance -= amount;
                break;
            case "credit":
                user.CreditBalance -= amount;
                break;
        }
    }

    private async Task SendTransferNotificationEmailAsync(User recipient, User sender, decimal amount, string senderAccountType)
    {
        try
        {
            var subject = $"💰 Notification de transfert reçu - {amount:F2}";
            
            var body = $@"
                <h2>Vous avez reçu un transfert!</h2>
                <p>Chère client {recipient.FullName},</p>
                <p>Vous avez reçu un transfert d'argent. Voici les détails:</p>
                
                <table style='border-collapse: collapse; width: 100%; margin: 20px 0;'>
                    <tr style='background-color: #f2f2f2;'>
                        <td style='border: 1px solid #ddd; padding: 10px; font-weight: bold;'>Montant</td>
                        <td style='border: 1px solid #ddd; padding: 10px;'>{amount:F2} MAD</td>
                    </tr>
                    <tr>
                        <td style='border: 1px solid #ddd; padding: 10px; font-weight: bold;'>Expéditeur</td>
                        <td style='border: 1px solid #ddd; padding: 10px;'>{sender.FullName}</td>
                    </tr>
                    <tr style='background-color: #f2f2f2;'>
                        <td style='border: 1px solid #ddd; padding: 10px; font-weight: bold;'>Compte Destinataire</td>
                        <td style='border: 1px solid #ddd; padding: 10px;'>Main Account</td>
                    </tr>
                    <tr>
                        <td style='border: 1px solid #ddd; padding: 10px; font-weight: bold;'>Compte Expéditeur</td>
                        <td style='border: 1px solid #ddd; padding: 10px;'>{senderAccountType}</td>
                    </tr>
                    <tr style='background-color: #f2f2f2;'>
                        <td style='border: 1px solid #ddd; padding: 10px; font-weight: bold;'>Date et Heure</td>
                        <td style='border: 1px solid #ddd; padding: 10px;'>{DateTime.UtcNow:dd/MM/yyyy HH:mm:ss}</td>
                    </tr>
                    <tr>
                        <td style='border: 1px solid #ddd; padding: 10px; font-weight: bold;'>Banque</td>
                        <td style='border: 1px solid #ddd; padding: 10px;'>NoxaBank</td>
                    </tr>
                </table>
                
                <p>Votre nouveau solde (Main Account): {recipient.MainBalance:F2} MAD</p>
                
                <p>Cordialement,<br/>
                <strong>L'équipe NoxaBank</strong></p>
            ";

            await _emailService.SendEmailAsync(
                recipient.Email,
                subject,
                body
            );
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Erreur lors de l'envoi d'email au destinataire: {ex.Message}");
        }
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var email = GetCurrentUserEmail();

        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { message = "Utilisateur non authentifié." });

        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email);

        if (user == null)
            return NotFound(new { message = "Client introuvable." });

        return Ok(new
        {
            id = user.Id,
            fullName = user.FullName,
            email = user.Email,
            phone = user.PhoneNumber ?? user.Phone ?? "",
            address = user.Address ?? "",
            birthDate = user.BirthDate,
            passportNumber = user.PassportNumber ?? user.PassportId ?? "",
            balances = new
            {
                creditBalance = user.CreditBalance,
                mainBalance = user.MainBalance,
                savingsBalance = user.SavingsBalance
            }
        });
    }

    [HttpGet("operations")]
    public async Task<IActionResult> GetOperations()
    {
        var email = GetCurrentUserEmail();

        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { message = "Utilisateur non authentifié." });

        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email);

        if (user == null)
            return NotFound(new { message = "Client introuvable." });

        var operations = await _db.Operations
            .AsNoTracking()
            .Where(o => o.RecipientUserId == user.Id)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new
            {
                id = o.Id,
                date = o.CreatedAt,
                recipient = o.RecipientFullName,
                amount = o.Amount,
                type = o.Type,
                depositMethod = o.DepositMethod
            })
            .ToListAsync();

        return Ok(operations);
    }

    public class ClientDepositRequest
    {
        public string DepositType { get; set; } = "cheque";
        public string AccountType { get; set; } = "main";
        public decimal Amount { get; set; }
        public string? Supplier { get; set; }
        public DateTime? DepositDate { get; set; }
        public DateTime? ChequeDate { get; set; }
        public IFormFile? ChequeImage { get; set; }
    }

    [HttpPost("deposit")]
    public async Task<IActionResult> Deposit([FromForm] ClientDepositRequest req)
    {
        var email = GetCurrentUserEmail();

        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { message = "Utilisateur non authentifié." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user == null)
            return NotFound(new { message = "Client introuvable." });

        if (!user.IsActive)
            return BadRequest(new { message = "Votre compte est inactif." });

        if (req.Amount <= 0)
            return BadRequest(new { message = "Montant invalide." });

        var depositType = (req.DepositType ?? "cheque").Trim().ToLower();
        var accountType = (req.AccountType ?? "main").Trim().ToLower();

        if (depositType != "cheque")
            return BadRequest(new { message = "Seul le dépôt par chèque est autorisé." });

        if (accountType != "main" && accountType != "savings" && accountType != "credit")
            return BadRequest(new { message = "Type de compte invalide." });

        if (string.IsNullOrWhiteSpace(req.Supplier))
            return BadRequest(new { message = "Le fournisseur est obligatoire pour un chèque." });

        if (req.DepositDate == null || req.ChequeDate == null)
            return BadRequest(new { message = "Les dates du chèque sont obligatoires." });

        var diffDays = (req.DepositDate.Value.Date - req.ChequeDate.Value.Date).Days;

        if (diffDays < 0)
            return BadRequest(new { message = "La date du chèque ne peut pas être après la date du dépôt." });

        if (diffDays > 30)
            return BadRequest(new { message = "Chèque refusé : plus de 30 jours." });

        AddBalance(user, accountType, req.Amount);

        _db.Operations.Add(new Operation
        {
            Type = "deposit",
            Amount = req.Amount,
            CreatedAt = DateTime.UtcNow,
            RecipientUserId = user.Id,
            RecipientFullName = user.FullName,
            DepositMethod = depositType
        });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Dépôt effectué avec succès.",
            balances = new
            {
                creditBalance = user.CreditBalance,
                mainBalance = user.MainBalance,
                savingsBalance = user.SavingsBalance
            }
        });
    }

    [HttpGet("search-recipient")]
    public async Task<IActionResult> SearchRecipient([FromQuery] string passportNumber)
    {
        var email = GetCurrentUserEmail();

        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { message = "Utilisateur non authentifié." });

        if (string.IsNullOrWhiteSpace(passportNumber))
            return BadRequest(new { message = "Passport ID obligatoire." });

        var currentUser = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (currentUser == null)
            return NotFound(new { message = "Client introuvable." });

        var recipient = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u =>
                (u.PassportNumber == passportNumber || u.PassportId == passportNumber) &&
                u.Id != currentUser.Id);

        if (recipient == null)
            return NotFound(new { message = "Aucun client trouvé avec ce Passport ID." });

        return Ok(new
        {
            id = recipient.Id,
            fullName = recipient.FullName,
            email = recipient.Email,
            passportNumber = recipient.PassportNumber ?? recipient.PassportId ?? "",
            isActive = recipient.IsActive
        });
    }

    public class TransferOtherClientRequest
    {
        public string RecipientPassportNumber { get; set; } = "";
        public string SenderAccountType { get; set; } = "main";
        public decimal Amount { get; set; }
    }

    [HttpPost("transfer/other-client")]
    public async Task<IActionResult> TransferToOtherClient([FromBody] TransferOtherClientRequest req)
    {
        var email = GetCurrentUserEmail();

        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { message = "Utilisateur non authentifié." });

        var sender = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (sender == null)
            return NotFound(new { message = "Client expéditeur introuvable." });

        if (!sender.IsActive)
            return BadRequest(new { message = "Votre compte est inactif." });

        if (req.Amount <= 0)
            return BadRequest(new { message = "Montant invalide." });

        var senderAccountType = (req.SenderAccountType ?? "main").Trim().ToLower();

        if (senderAccountType != "main" && senderAccountType != "savings" && senderAccountType != "credit")
            return BadRequest(new { message = "Compte expéditeur invalide." });

        if (string.IsNullOrWhiteSpace(req.RecipientPassportNumber))
            return BadRequest(new { message = "Passport ID du destinataire obligatoire." });

        var recipient = await _db.Users.FirstOrDefaultAsync(u =>
            (u.PassportNumber == req.RecipientPassportNumber || u.PassportId == req.RecipientPassportNumber) &&
            u.Id != sender.Id);

        if (recipient == null)
            return NotFound(new { message = "Destinataire introuvable." });

        if (!recipient.IsActive)
            return BadRequest(new { message = "Le compte du destinataire est inactif." });

        var senderBalance = GetBalanceByAccount(sender, senderAccountType);

        if (senderBalance < req.Amount)
            return BadRequest(new { message = "Solde insuffisant." });

        SubtractBalance(sender, senderAccountType, req.Amount);
        recipient.MainBalance += req.Amount;

        _db.Operations.Add(new Operation
        {
            Type = "transfer-out",
            Amount = -req.Amount,
            CreatedAt = DateTime.UtcNow,
            RecipientUserId = sender.Id,
            RecipientFullName = recipient.FullName,
            DepositMethod = senderAccountType
        });

        _db.Operations.Add(new Operation
        {
            Type = "transfer-in",
            Amount = req.Amount,
            CreatedAt = DateTime.UtcNow,
            RecipientUserId = recipient.Id,
            RecipientFullName = sender.FullName,
            DepositMethod = "main"
        });

        await _db.SaveChangesAsync();

        // 🎯 Envoyer l'email de notification au destinataire
        await SendTransferNotificationEmailAsync(recipient, sender, req.Amount, senderAccountType);

        return Ok(new
        {
            message = "Transfert effectué avec succès.",
            balances = new
            {
                creditBalance = sender.CreditBalance,
                mainBalance = sender.MainBalance,
                savingsBalance = sender.SavingsBalance
            }
        });
    }

    public class TransferBetweenOwnAccountsRequest
    {
        public string FromAccountType { get; set; } = "main";
        public string ToAccountType { get; set; } = "savings";
        public decimal Amount { get; set; }
    }

    [HttpPost("transfer/my-accounts")]
    public async Task<IActionResult> TransferBetweenOwnAccounts([FromBody] TransferBetweenOwnAccountsRequest req)
    {
        var email = GetCurrentUserEmail();

        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { message = "Utilisateur non authentifié." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user == null)
            return NotFound(new { message = "Client introuvable." });

        if (!user.IsActive)
            return BadRequest(new { message = "Votre compte est inactif." });

        if (req.Amount <= 0)
            return BadRequest(new { message = "Montant invalide." });

        var fromAccount = (req.FromAccountType ?? "main").Trim().ToLower();
        var toAccount = (req.ToAccountType ?? "savings").Trim().ToLower();

        if (fromAccount != "main" && fromAccount != "savings" && fromAccount != "credit")
            return BadRequest(new { message = "Compte source invalide." });

        if (toAccount != "main" && toAccount != "savings" && toAccount != "credit")
            return BadRequest(new { message = "Compte destination invalide." });

        if (fromAccount == toAccount)
            return BadRequest(new { message = "Le compte source et destination doivent être différents." });

        var sourceBalance = GetBalanceByAccount(user, fromAccount);

        if (sourceBalance < req.Amount)
            return BadRequest(new { message = "Solde insuffisant." });

        SubtractBalance(user, fromAccount, req.Amount);
        AddBalance(user, toAccount, req.Amount);

        _db.Operations.Add(new Operation
        {
            Type = "internal-transfer",
            Amount = req.Amount,
            CreatedAt = DateTime.UtcNow,
            RecipientUserId = user.Id,
            RecipientFullName = $"{fromAccount} -> {toAccount}",
            DepositMethod = fromAccount
        });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Transfert entre vos comptes effectué avec succès.",
            balances = new
            {
                creditBalance = user.CreditBalance,
                mainBalance = user.MainBalance,
                savingsBalance = user.SavingsBalance
            }
        });
    }

    public class UpdateProfileRequest
    {
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Address { get; set; } = "";
        public DateTime? BirthDate { get; set; }
        public string Password { get; set; } = "";
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest req)
    {
        var currentEmail = GetCurrentUserEmail();

        if (string.IsNullOrWhiteSpace(currentEmail))
            return Unauthorized(new { message = "Utilisateur non authentifié." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == currentEmail);

        if (user == null)
            return NotFound(new { message = "Client introuvable." });

        if (string.IsNullOrWhiteSpace(req.FullName))
            return BadRequest(new { message = "Le nom complet est obligatoire." });

        if (string.IsNullOrWhiteSpace(req.Email))
            return BadRequest(new { message = "L'email est obligatoire." });

        var emailExists = await _db.Users.AnyAsync(u => u.Email == req.Email && u.Id != user.Id);
        if (emailExists)
            return BadRequest(new { message = "Cet email est déjà utilisé." });

        user.FullName = req.FullName.Trim();
        user.Email = req.Email.Trim();
        user.Address = req.Address?.Trim() ?? "";
        user.BirthDate = req.BirthDate;

        if (!string.IsNullOrWhiteSpace(req.Phone))
        {
            user.PhoneNumber = req.Phone.Trim();
            user.Phone = req.Phone.Trim();
        }

        if (!string.IsNullOrWhiteSpace(req.Password))
        {
            
              if (!string.IsNullOrWhiteSpace(req.Password))
{
    user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password);
}
      }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Profil mis à jour avec succès.",
            user = new
            {
                fullName = user.FullName,
                email = user.Email,
                phone = user.PhoneNumber ?? user.Phone ?? "",
                address = user.Address ?? "",
                birthDate = user.BirthDate
            }
        });
    }

    // ========================== PAY BILLS ==========================

    public class PayBillRequest
    {
        public string Provider { get; set; } = "";
        public string AccountType { get; set; } = "main";
        public decimal Amount { get; set; }
    }

    [HttpPost("pay-bill")]
    public async Task<IActionResult> PayBill([FromBody] PayBillRequest req)
    {
        var email = GetCurrentUserEmail();

        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { message = "Utilisateur non authentifié." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user == null)
            return NotFound(new { message = "Client introuvable." });

        if (!user.IsActive)
            return BadRequest(new { message = "Votre compte est inactif." });

        if (req.Amount <= 0)
            return BadRequest(new { message = "Montant invalide." });

        if (string.IsNullOrWhiteSpace(req.Provider))
            return BadRequest(new { message = "Fournisseur obligatoire." });

        var accountType = (req.AccountType ?? "main").Trim().ToLower();

        if (accountType != "main" && accountType != "savings" && accountType != "credit")
            return BadRequest(new { message = "Type de compte invalide." });

        var accountBalance = GetBalanceByAccount(user, accountType);

        if (accountBalance < req.Amount)
            return BadRequest(new { message = "Solde insuffisant." });

        // Déduire le montant du compte
        SubtractBalance(user, accountType, req.Amount);

        // Créer l'enregistrement du paiement de facture
        var billPayment = new BillPayment
        {
            UserId = user.Id,
            Provider = req.Provider.Trim(),
            Amount = req.Amount,
            AccountType = accountType,
            Status = "completed",
            CreatedAt = DateTime.UtcNow
        };

        _db.BillPayments.Add(billPayment);

        // Enregistrer dans l'historique des opérations
        _db.Operations.Add(new Operation
        {
            Type = "bill-payment",
            Amount = -req.Amount,
            CreatedAt = DateTime.UtcNow,
            RecipientUserId = user.Id,
            RecipientFullName = req.Provider,
            DepositMethod = accountType
        });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Paiement de facture effectué avec succès.",
            billPaymentId = billPayment.Id,
            balances = new
            {
                creditBalance = user.CreditBalance,
                mainBalance = user.MainBalance,
                savingsBalance = user.SavingsBalance
            }
        });
    }

    [HttpPost("pay-bill/cancel/{billPaymentId}")]
    public async Task<IActionResult> CancelBillPayment(int billPaymentId)
    {
        var email = GetCurrentUserEmail();

        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { message = "Utilisateur non authentifié." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user == null)
            return NotFound(new { message = "Client introuvable." });

        var billPayment = await _db.BillPayments.FirstOrDefaultAsync(b => b.Id == billPaymentId && b.UserId == user.Id);

        if (billPayment == null)
            return NotFound(new { message = "Paiement de facture non trouvé." });

        if (billPayment.Status != "completed")
            return BadRequest(new { message = "Seuls les paiements complétés peuvent être annulés." });

        // Vérifier que l'annulation est dans les 48h
        var timeSincePayment = DateTime.UtcNow - billPayment.CreatedAt;
        if (timeSincePayment.TotalHours > 48)
            return BadRequest(new { message = "Impossible d'annuler le paiement après 48 heures." });

        // Remboursez le montant
        AddBalance(user, billPayment.AccountType, billPayment.Amount);
        billPayment.Status = "cancelled";
        billPayment.CancelledAt = DateTime.UtcNow;

        // Enregistrer l'annulation dans l'historique
        _db.Operations.Add(new Operation
        {
            Type = "bill-payment-cancel",
            Amount = billPayment.Amount,
            CreatedAt = DateTime.UtcNow,
            RecipientUserId = user.Id,
            RecipientFullName = $"Annulation - {billPayment.Provider}",
            DepositMethod = billPayment.AccountType
        });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Paiement de facture annulé avec succès.",
            balances = new
            {
                creditBalance = user.CreditBalance,
                mainBalance = user.MainBalance,
                savingsBalance = user.SavingsBalance
            }
        });
    }

    [HttpGet("bill-payments")]
    public async Task<IActionResult> GetBillPayments()
    {
        var email = GetCurrentUserEmail();

        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { message = "Utilisateur non authentifié." });

        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email);

        if (user == null)
            return NotFound(new { message = "Client introuvable." });

        var billPayments = await _db.BillPayments
            .AsNoTracking()
            .Where(b => b.UserId == user.Id)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new
            {
                id = b.Id,
                provider = b.Provider,
                amount = b.Amount,
                accountType = b.AccountType,
                status = b.Status,
                createdAt = b.CreatedAt,
                cancelledAt = b.CancelledAt,
                canCancel = b.Status == "completed" && (DateTime.UtcNow - b.CreatedAt).TotalHours <= 48
            })
            .ToListAsync();

        return Ok(billPayments);
    }
}