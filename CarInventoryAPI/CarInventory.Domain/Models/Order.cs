namespace CarInventory.Domain.Models;

public class Order
{
    public int Id { get; set; }

    // Foreign keys
    public int VehicleId { get; set; }
    public int CustomerId { get; set; }

    // Navigation properties (EF uses these to build JOINs)
    public Vehicle Vehicle { get; set; } = null!;
    public Customer Customer { get; set; } = null!;

    public OrderStatus Status { get; set; } = OrderStatus.Inquiry;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ClosedAt { get; set; }
}

public enum OrderStatus
{
    Inquiry,
    Negotiation,
    Financing,
    Closed,
    Lost
}