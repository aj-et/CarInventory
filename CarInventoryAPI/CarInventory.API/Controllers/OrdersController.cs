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
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHubContext<InventoryHub> _hub;

    public OrdersController(AppDbContext context, IHubContext<InventoryHub> hub)
    {
        _context = context;
        _hub = hub;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Order>>> GetAll()
        => Ok(await _context.Orders
            .Include(o => o.Vehicle)
            .Include(o => o.Customer)
            .ToListAsync());

    [HttpGet("{id}")]
    public async Task<ActionResult<Order>> GetById(int id)
    {
        var order = await _context.Orders
            .Include(o => o.Vehicle)
            .Include(o => o.Customer)
            .FirstOrDefaultAsync(o => o.Id == id);

        return order is null ? NotFound() : Ok(order);
    }

    [HttpPost]
    public async Task<ActionResult<Order>> Create(CreateOrderDto dto)
    {
        var vehicle = await _context.Vehicles.FindAsync(dto.VehicleId);
        if (vehicle is null) return BadRequest("Vehicle not found.");
        if (vehicle.Status != VehicleStatus.Available)
            return BadRequest("Vehicle is not available.");

        var customer = await _context.Customers.FindAsync(dto.CustomerId);
        if (customer is null) return BadRequest("Customer not found.");

        var order = new Order
        {
            VehicleId = dto.VehicleId,
            CustomerId = dto.CustomerId,
            Notes = dto.Notes,
            Status = OrderStatus.Inquiry,
            CreatedAt = DateTime.UtcNow
        };

        vehicle.Status = VehicleStatus.Reserved;
        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        await _hub.Clients.All.SendAsync("OrderCreated", order);
        await _hub.Clients.All.SendAsync("VehicleUpdated", vehicle);
        await BroadcastStats();

        return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] OrderStatus newStatus)
    {
        var order = await _context.Orders
            .Include(o => o.Vehicle)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null) return NotFound();

        order.Status = newStatus;

        if (newStatus == OrderStatus.Closed)
        {
            order.Vehicle.Status = VehicleStatus.Sold;
            order.ClosedAt = DateTime.UtcNow;
        }
        else if (newStatus == OrderStatus.Lost)
        {
            order.Vehicle.Status = VehicleStatus.Available;
            order.ClosedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        await _hub.Clients.All.SendAsync("OrderUpdated", order);
        await _hub.Clients.All.SendAsync("VehicleUpdated", order.Vehicle);
        await BroadcastStats();

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var order = await _context.Orders
            .Include(o => o.Vehicle)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null) return NotFound();

        order.Vehicle.Status = VehicleStatus.Available;
        _context.Orders.Remove(order);
        await _context.SaveChangesAsync();

        await _hub.Clients.All.SendAsync("OrderDeleted", id);
        await _hub.Clients.All.SendAsync("VehicleUpdated", order.Vehicle);
        await BroadcastStats();

        return NoContent();
    }

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