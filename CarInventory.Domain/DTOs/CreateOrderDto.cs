namespace CarInventory.Domain.DTOs;

public class CreateOrderDto
{
    public int VehicleId { get; set; }
    public int CustomerId { get; set; }
    public string? Notes { get; set; }
}