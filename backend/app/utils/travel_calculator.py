"""
Travel calculation utilities for estimating arrival times and journey details
"""
from datetime import datetime, timedelta

def calculate_estimated_arrival(departure_time, distance_km, average_speed_kmh=60, progress_percentage=0, current_time=None):
    """
    Calculate estimated arrival time based on distance and average speed
    Can calculate from start or from current progress
    
    Args:
        departure_time (str): Departure time in HH:MM format
        distance_km (float): Distance in kilometers
        average_speed_kmh (int): Average speed in km/h (default: 60 km/h)
        progress_percentage (float): Current journey progress (0-100)
        current_time (str): Current time in HH:MM format (optional, uses now if not provided)
    
    Returns:
        dict: Contains estimated_arrival_time, travel_duration_hours, travel_duration_minutes, etc.
    """
    try:
        # Parse departure time
        if isinstance(departure_time, str):
            dep_hours, dep_minutes = map(int, departure_time.split(':'))
        else:
            return None
        
        # Calculate total travel duration
        total_travel_hours = distance_km / average_speed_kmh
        total_travel_duration_hours = int(total_travel_hours)
        total_travel_duration_minutes = int((total_travel_hours - total_travel_duration_hours) * 60)
        total_travel_minutes = int(total_travel_hours * 60)
        
        # If journey has started (progress > 0), calculate from current position
        if progress_percentage > 0 and progress_percentage < 100:
            # Calculate remaining distance
            remaining_distance = distance_km * ((100 - progress_percentage) / 100)
            remaining_travel_hours = remaining_distance / average_speed_kmh
            remaining_hours = int(remaining_travel_hours)
            remaining_minutes = int((remaining_travel_hours - remaining_hours) * 60)
            
            # Use current time or now
            if current_time:
                curr_hours, curr_minutes = map(int, current_time.split(':'))
                base_time = datetime.now().replace(hour=curr_hours, minute=curr_minutes, second=0, microsecond=0)
            else:
                base_time = datetime.now()
            
            # Calculate arrival from current position
            arrival_datetime = base_time + timedelta(hours=remaining_hours, minutes=remaining_minutes)
            
            return {
                'estimated_arrival_time': arrival_datetime.strftime('%H:%M'),
                'travel_duration_hours': total_travel_duration_hours,
                'travel_duration_minutes': total_travel_duration_minutes,
                'total_travel_minutes': total_travel_minutes,
                'remaining_hours': remaining_hours,
                'remaining_minutes': remaining_minutes,
                'remaining_distance_km': round(remaining_distance, 2),
                'distance_km': distance_km,
                'average_speed_kmh': average_speed_kmh,
                'progress_percentage': progress_percentage,
                'is_dynamic': True,
                'calculation_type': 'from_current_position'
            }
        else:
            # Calculate from departure (journey not started or completed)
            departure_datetime = datetime.now().replace(hour=dep_hours, minute=dep_minutes, second=0, microsecond=0)
            arrival_datetime = departure_datetime + timedelta(hours=total_travel_duration_hours, minutes=total_travel_duration_minutes)
            
            return {
                'estimated_arrival_time': arrival_datetime.strftime('%H:%M'),
                'travel_duration_hours': total_travel_duration_hours,
                'travel_duration_minutes': total_travel_duration_minutes,
                'total_travel_minutes': total_travel_minutes,
                'distance_km': distance_km,
                'average_speed_kmh': average_speed_kmh,
                'progress_percentage': progress_percentage,
                'is_dynamic': False,
                'calculation_type': 'from_departure'
            }
    except Exception as e:
        print(f"Error calculating estimated arrival: {e}")
        return None

def format_duration(hours, minutes):
    """Format duration in a human-readable way"""
    if hours > 0 and minutes > 0:
        return f"{hours}h {minutes}m"
    elif hours > 0:
        return f"{hours}h"
    else:
        return f"{minutes}m"

def calculate_progress_percentage(current_time, departure_time, arrival_time):
    """
    Calculate journey progress percentage based on current time
    
    Args:
        current_time (str): Current time in HH:MM format
        departure_time (str): Departure time in HH:MM format
        arrival_time (str): Arrival time in HH:MM format
    
    Returns:
        float: Progress percentage (0-100)
    """
    try:
        def time_to_minutes(time_str):
            hours, minutes = map(int, time_str.split(':'))
            return hours * 60 + minutes
        
        current_mins = time_to_minutes(current_time)
        departure_mins = time_to_minutes(departure_time)
        arrival_mins = time_to_minutes(arrival_time)
        
        # Handle overnight journeys
        if arrival_mins < departure_mins:
            arrival_mins += 24 * 60
        if current_mins < departure_mins:
            current_mins += 24 * 60
        
        total_duration = arrival_mins - departure_mins
        elapsed_time = current_mins - departure_mins
        
        if elapsed_time < 0:
            return 0  # Journey hasn't started
        elif elapsed_time > total_duration:
            return 100  # Journey completed
        else:
            return (elapsed_time / total_duration) * 100
    except Exception as e:
        print(f"Error calculating progress: {e}")
        return 0
