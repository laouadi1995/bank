using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NoxaBank.Api.Data;
using NoxaBank.Api.Models;


/*
Ce contrôleur permet à l’administrateur de gérer les comptes des clients.
Il permet de rechercher un client par numéro de passeport, consulter les soldes
des comptes (Main, Savings, Credit) et effectuer un transfert d’argent entre comptes.
Toutes les opérations sont enregistrées dans la base de données.
*/



namespace NoxaBank.Api.Controllers
{
    [ApiController]
    [Route("api/admin/accounts")]
    public class AdminAccountsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AdminAccountsController(AppDbContext db)
        {
            _db = db;
        }

        // ✅ DTO renvoyé au Front
        public class ClientDto
        {
            public int Id { get; set; }
            public string FullName { get; set; } = "";
            public string PassportNumber { get; set; } = "";
            public bool IsActive { get; set; }

            public decimal MainBalance { get; set; }
            public decimal SavingsBalance { get; set; }
            public decimal CreditBalance { get; set; }
        }

        private async Task<User?> FindByPassport(string passport)
        {
            var p = passport.Trim();
            return await _db.Users.FirstOrDefaultAsync(u =>
                u.PassportNumber == p || u.PassportId == p
            );
        }

        // ✅ GET: /api/admin/accounts/client-by-passport/{passport}
        [HttpGet("client-by-passport/{passport}")]
        public async Task<IActionResult> GetClientByPassport(string passport)
        {
            var user = await FindByPassport(passport);
            if (user == null) return NotFound("Client introuvable.");

            var dto = new ClientDto
            {
                Id = user.Id,
                FullName = user.FullName,
                PassportNumber = user.PassportNumber ?? user.PassportId ?? "",
                IsActive = user.IsActive,
                MainBalance = user.MainBalance,
                SavingsBalance = user.SavingsBalance,
                CreditBalance = user.CreditBalance
            };

            return Ok(dto);
        }

        // ✅ GET: /api/admin/accounts/{passport}/list  (pour ton code existant)
        [HttpGet("{passport}/list")]
        public async Task<IActionResult> ListAccounts(string passport)
        {
            var user = await FindByPassport(passport);
            if (user == null) return NotFound("Client introuvable.");

            // On renvoie le format "accounts" que ton front utilise déjà
            return Ok(new
            {
                passport = user.PassportNumber ?? user.PassportId,
                accounts = new[]
                {
                    new { type = "Main", balance = user.MainBalance },
                    new { type = "Savings", balance = user.SavingsBalance },
                    new { type = "Credit", balance = user.CreditBalance },
                }
            });
        }

        public class TransferRequest
        {
            public string SenderPassport { get; set; } = "";
            public string SenderAccountType { get; set; } = "Main";     // Main | Savings
            public string RecipientPassport { get; set; } = "";
            public string RecipientAccountType { get; set; } = "Main";  // Main | Savings
            public decimal Amount { get; set; }
        }

        private static decimal GetBalance(User u, string type)
        {
            return type switch
            {
                "Main" => u.MainBalance,
                "Savings" => u.SavingsBalance,
                "Credit" => u.CreditBalance,
                _ => u.MainBalance
            };
        }

        private static void SetBalance(User u, string type, decimal value)
        {
            switch (type)
            {
                case "Main":
                    u.MainBalance = value;
                    break;
                case "Savings":
                    u.SavingsBalance = value;
                    break;
                case "Credit":
                    u.CreditBalance = value;
                    break;
                default:
                    u.MainBalance = value;
                    break;
            }
        }

        // ✅ POST: /api/admin/accounts/transfer
        [HttpPost("transfer")]
        public async Task<IActionResult> Transfer([FromBody] TransferRequest req)
        {
            if (req.Amount <= 0) return BadRequest("Montant invalide.");

            var sender = await FindByPassport(req.SenderPassport);
            if (sender == null) return NotFound("Expéditeur introuvable.");

            var recipient = await FindByPassport(req.RecipientPassport);
            if (recipient == null) return NotFound("Destinataire introuvable.");

            var senderBal = GetBalance(sender, req.SenderAccountType);
            if (req.Amount > senderBal) return BadRequest("Solde insuffisant.");

            // Débit / Crédit
            SetBalance(sender, req.SenderAccountType, senderBal - req.Amount);

            var recBal = GetBalance(recipient, req.RecipientAccountType);
            SetBalance(recipient, req.RecipientAccountType, recBal + req.Amount);

            // Save + log
            _db.Operations.Add(new Operation
            {
                Type = "transfer",
                CreatedAt = DateTime.UtcNow,
                SenderUserId = sender.Id,
                RecipientUserId = recipient.Id,
                SenderFullName = sender.FullName,
                RecipientFullName = recipient.FullName,
                Amount = req.Amount
            });

            await _db.SaveChangesAsync();

            return Ok(new { message = "Transfert effectué ✅" });
        }
    }
}
