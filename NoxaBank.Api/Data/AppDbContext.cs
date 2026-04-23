using Microsoft.EntityFrameworkCore;
using NoxaBank.Api.Models;

namespace NoxaBank.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<BankAccount> BankAccounts => Set<BankAccount>();
    public DbSet<Operation> Operations => Set<Operation>();
    public DbSet<OperationLog> OperationLogs => Set<OperationLog>();
    public DbSet<BillPayment> BillPayments => Set<BillPayment>();
    public DbSet<EmailVerification> EmailVerifications => Set<EmailVerification>();
    public DbSet<LoginOtp> LoginOtps => Set<LoginOtp>();
    public DbSet<PendingSignUp> PendingSignUps => Set<PendingSignUp>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<BankAccount>()
            .HasIndex(a => new { a.UserId, a.Type })
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Phone)
            .IsUnique()
            .HasFilter("[Phone] IS NOT NULL");

        modelBuilder.Entity<User>()
            .HasIndex(u => u.PassportNumber)
            .IsUnique()
            .HasFilter("[PassportNumber] IS NOT NULL");
    }
}
