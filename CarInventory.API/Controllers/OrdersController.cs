using CarInventory.Domain.DTOs;
using CarInventory.Domain.Models;
using CarInventory.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace CarInventory.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _context;

    public OrdersController(AppDbContext context)
    {
        _context = context;
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
        // Mark the vehicle as Reserved when an order is created
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

        // Sync vehicle status with order status
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

        // Release the vehicle back to Available
        order.Vehicle.Status = VehicleStatus.Available;
        _context.Orders.Remove(order);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}