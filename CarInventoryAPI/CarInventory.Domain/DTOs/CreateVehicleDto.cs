namespace CarInventory.Domain.DTOs;

public class CreateVehicleDto
{
    public string VIN { get; set; } = string.Empty;
    public string StockNumber { get; set; } = string.Empty;
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Year { get; set; }
    public string Trim { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public int Mileage { get; set; }
    public decimal MSRP { get; set; }
    public decimal SellingPrice { get; set; }
}