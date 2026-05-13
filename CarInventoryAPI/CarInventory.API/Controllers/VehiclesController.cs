using CarInventory.API.Hubs;
using CarInventory.Domain.DTOs;
using CarInventory.Domain.Models;
using CarInventory.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace CarInventory.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VehiclesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHubContext<InventoryHub> _hub;

    public VehiclesController(AppDbContext context, IHubContext<InventoryHub> hub)
    {
        _context = context;
        _hub = hub;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Vehicle>>> GetAll()
        => Ok(await _context.Vehicles.ToListAsync());

    [HttpGet("{id}")]
    public async Task<ActionResult<Vehicle>> GetById(int id)
    {
        var vehicle = await _context.Vehicles.FindAsync(id);
        return vehicle is null ? NotFound() : Ok(vehicle);
    }

    [HttpGet("stats")]
    public async Task<ActionResult> GetStats()
    {
        var stats = new
        {
            Total = await _context.Vehicles.CountAsync(),
            Available = await _context.Vehicles.CountAsync(v => v.Status == VehicleStatus.Available),
            Reserved = await _context.Vehicles.CountAsync(v => v.Status == VehicleStatus.Reserved),
            Sold = await _context.Vehicles.CountAsync(v => v.Status == VehicleStatus.Sold),
            InService = await _context.Vehicles.CountAsync(v => v.Status == VehicleStatus.InService)
        };
        return Ok(stats);
    }

    [HttpPost]
    public async Task<ActionResult<Vehicle>> Create(CreateVehicleDto dto)
    {
        var vehicle = new Vehicle
        {
            VIN = dto.VIN,
            StockNumber = dto.StockNumber,
            Make = dto.Make,
            Model = dto.Model,
            Year = dto.Year,
            Trim = dto.Trim,
            Color = dto.Color,
            Mileage = dto.Mileage,
            MSRP = dto.MSRP,
            SellingPrice = dto.SellingPrice,
            Status = VehicleStatus.Available,
            CreatedAt = DateTime.UtcNow
        };

        _context.Vehicles.Add(vehicle);
        await _context.SaveChangesAsync();

        // Broadcast to all connected clients
        await _hub.Clients.All.SendAsync("VehicleAdded", vehicle);
        await BroadcastStats();

        return CreatedAtAction(nameof(GetById), new { id = vehicle.Id }, vehicle);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Vehicle vehicle)
    {
        if (id != vehicle.Id) return BadRequest();
        _context.Entry(vehicle).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        await _hub.Clients.All.SendAsync("VehicleUpdated", vehicle);
        await BroadcastStats();

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var vehicle = await _context.Vehicles.FindAsync(id);
        if (vehicle is null) return NotFound();
        _context.Vehicles.Remove(vehicle);
        await _context.SaveChangesAsync();

        await _hub.Clients.All.SendAsync("VehicleDeleted", id);
        await BroadcastStats();

        return NoContent();
    }

    // Helper to broadcast live stats to dashboard
    private async Task BroadcastStats()
    {
        var stats = new
        {
            Total = await _context.Vehicles.CountAsync(),
            Available = await _context.Vehicles.CountAsync(v => v.Status == VehicleStatus.Available),
            Reserved = await _context.Vehicles.CountAsync(v => v.Status == VehicleStatus.Reserved),
            Sold = await _context.Vehicles.CountAsync(v => v.Status == VehicleStatus.Sold),
            InService = await _context.Vehicles.CountAsync(v => v.Status == VehicleStatus.InService)
        };
        await _hub.Clients.All.SendAsync("StatsUpdated", stats);
    }
}