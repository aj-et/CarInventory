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
public class VehiclesController : ControllerBase
{
    private readonly AppDbContext _context;

    public VehiclesController(AppDbContext context)
    {
        _context = context;
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
            CreatedAt = DateTime.UtcNow // set server-side, never from client
        };
        
        _context.Vehicles.Add(vehicle);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = vehicle.Id }, vehicle);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Vehicle vehicle)
    {
        if (id != vehicle.Id) return BadRequest();
        _context.Entry(vehicle).State = EntityState.Modified;
        await _context.SaveChangesAsync();
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
        return NoContent();
    }
}