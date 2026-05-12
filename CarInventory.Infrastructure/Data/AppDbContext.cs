using CarInventory.Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace CarInventory.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Vehicle>(entity =>
        {
            // Vehicle config
            entity.HasKey(v => v.Id);
            entity.Property(v => v.VIN).IsRequired().HasMaxLength(17);
            entity.Property(v => v.MSRP).HasColumnType("decimal(18,2)");
            entity.Property(v => v.SellingPrice).HasColumnType("decimal(18,2)");
        });

        // Customer config
        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Email).IsRequired().HasMaxLength(255);
            entity.HasIndex(c => c.Email).IsUnique();
        });

        // Order config + relationships
        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(o => o.Id);

            // One vehicle can have many orders (history), but only one active
            entity.HasOne(o => o.Vehicle)
                  .WithMany()
                  .HasForeignKey(o => o.VehicleId)
                  .OnDelete(DeleteBehavior.Restrict);

            // One customer can have many orders
            entity.HasOne(o => o.Customer)
                  .WithMany(c => c.Orders)
                  .HasForeignKey(o => o.CustomerId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Email).IsRequired().HasMaxLength(255);
            entity.HasIndex(u => u.Email).IsUnique();
        });
    }
}