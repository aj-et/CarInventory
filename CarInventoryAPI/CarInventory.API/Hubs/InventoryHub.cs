using Microsoft.AspNetCore.SignalR;

namespace CarInventory.API.Hubs;

public class InventoryHub : Hub
{
    // Clients connect here automatically
    // We broadcast TO clients from controllers
    // No methods needed here for our basic use case

    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SendAsync("Connected", "Connected to CarInventory real-time hub");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }
}