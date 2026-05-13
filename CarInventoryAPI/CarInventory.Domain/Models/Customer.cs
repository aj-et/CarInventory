namespace CarInventory.Domain.Models;
using System.Text.Json.Serialization;

public class Customer
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    [JsonIgnore]
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}