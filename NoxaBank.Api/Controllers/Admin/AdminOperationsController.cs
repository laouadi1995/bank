using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NoxaBank.Api.Data;


/*
Ce contrôleur permet à l’administrateur de consulter les opérations de la banque.
Il récupère la liste des transactions (transferts et dépôts) depuis la base de données
et permet aussi de rechercher une opération par nom de l’expéditeur ou du destinataire.
*/


namespace NoxaBank.Api.Controllers
{
    [ApiController]
    [Route("api/admin/operations")]
    public class AdminOperationsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AdminOperationsController(AppDbContext db)
        {
            _db = db;
        }

        // GET: /api/admin/operations?search=laouadi
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search)
        {
            var q = _db.Operations.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                q = q.Where(o =>
                    (o.SenderFullName ?? "").ToLower().Contains(s) ||
                    (o.RecipientFullName ?? "").ToLower().Contains(s)
                );
            }

            var data = await q
                .OrderByDescending(o => o.CreatedAt)
                .Take(500)
                .Select(o => new
                {
                    id = o.Id,
                    date = o.CreatedAt,
                    type = o.Type, // transfer | deposit
                    receiver = o.RecipientFullName,
                    sender = o.Type == "deposit"
                        ? (o.DepositMethod == "cheque" ? "Deposit (cheque)" : "Deposit (cash)")
                        : o.SenderFullName,
                    amount = o.Amount
                })
                .ToListAsync();

            return Ok(data);
        }
    }
}
