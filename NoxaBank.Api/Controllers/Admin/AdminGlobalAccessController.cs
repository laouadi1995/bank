using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NoxaBank.Api.Data;
using NoxaBank.Api.Models;


/*
Ce contrôleur permet à l’administrateur d’effectuer des opérations globales sur les comptes des clients.
Il permet notamment de faire un dépôt (cash ou cheque) sur les comptes Main, Savings ou Credit
en recherchant le client par numéro de passeport et en enregistrant l’opération dans la base de données.
*/


namespace NoxaBank.Api.Controllers
{
    [ApiController]
    [Route("api/admin/global-access")]
    public class AdminGlobalAccessController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AdminGlobalAccessController(AppDbContext db)
        {
            _db = db;
        }

        private async Task<User?> FindByPassport(string passport)
        {
            var p = passport.Trim();
            return await _db.Users.FirstOrDefaultAsync(u =>
                u.PassportNumber == p || u.PassportId == p
            );
        }

        // FormData keys (comme ton front)
        [HttpPost("deposit")]
        public async Task<IActionResult> Deposit()
        {
            var form = await Request.ReadFormAsync();

            var passport = (form["PassportNumber"].ToString() ?? "").Trim();
            var depositType = (form["DepositType"].ToString() ?? "cash").Trim().ToLower();   // cash | cheque
            var accountType = (form["AccountType"].ToString() ?? "main").Trim().ToLower();  // main | savings | credit

            if (!decimal.TryParse(form["Amount"], out var amount) || amount <= 0)
                return BadRequest("Montant invalide.");

            var user = await FindByPassport(passport);
            if (user == null) return NotFound("Client introuvable.");

            // Credit/Main/Savings
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
                default:
                    user.MainBalance += amount;
                    break;
            }

            _db.Operations.Add(new Operation
            {
                Type = "deposit",
                DepositMethod = depositType, // cash | cheque
                CreatedAt = DateTime.UtcNow,
                RecipientUserId = user.Id,
                RecipientFullName = user.FullName,
                Amount = amount
            });

            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "Dépôt effectué.",
                clientId = user.Id,
                fullName = user.FullName,
                passportNumber = user.PassportNumber ?? user.PassportId,
                balances = new
                {
                    creditBalance = user.CreditBalance,
                    mainBalance = user.MainBalance,
                    savingsBalance = user.SavingsBalance
                }
            });
        }
    }
}
