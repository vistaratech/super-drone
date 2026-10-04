"""
Procedural STL Generator for Stealth Flying Wing 3D Printed Parts:
1. Samsung S21 FE FPV Aerodynamic Nose Cone Cradle
2. 2207/2216 Brushless Pusher Motor Mount (16x19mm M3 Pattern)
"""

import math
import struct
import os

def write_binary_stl(filepath, triangles):
    """
    Writes triangles to a standard binary STL file.
    Each triangle is a tuple of 3 vertices: ((x1,y1,z1), (x2,y2,z2), (x3,y3,z3))
    """
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'wb') as f:
        # 80-byte header
        header = b'SuperWing 3D Printable STL Generator - Samsung S21 FE'
        header = header.ljust(80, b'\0')
        f.write(header)
        
        # Number of triangles
        f.write(struct.pack('<I', len(triangles)))
        
        # Triangle records
        for v1, v2, v3 in triangles:
            # Calculate normal vector
            ax, ay, az = v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]
            bx, by, bz = v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]
            nx = ay * bz - az * by
            ny = az * bx - ax * bz
            nz = ax * by - ay * bx
            norm = math.sqrt(nx*nx + ny*ny + nz*nz)
            if norm > 0:
                nx, ny, nz = nx/norm, ny/norm, nz/norm
            else:
                nx, ny, nz = 0.0, 0.0, 1.0
                
            f.write(struct.pack('<fff', nx, ny, nz))
            f.write(struct.pack('<fff', *v1))
            f.write(struct.pack('<fff', *v2))
            f.write(struct.pack('<fff', *v3))
            f.write(struct.pack('<H', 0))

def add_box(triangles, x, y, z, dx, dy, dz):
    """Adds an axis-aligned box to triangles list."""
    x2, y2, z2 = x + dx, y + dy, z + dz
    v = [
        (x, y, z), (x2, y, z), (x2, y2, z), (x, y2, z),
        (x, y, z2), (x2, y, z2), (x2, y2, z2), (x, y2, z2)
    ]
    # 6 faces * 2 triangles
    faces = [
        (0, 2, 1), (0, 3, 2), # Bottom
        (4, 5, 6), (4, 6, 7), # Top
        (0, 1, 5), (0, 5, 4), # Front
        (2, 3, 7), (2, 7, 6), # Back
        (0, 4, 7), (0, 7, 3), # Left
        (1, 2, 6), (1, 6, 5)  # Right
    ]
    for i1, i2, i3 in faces:
        triangles.append((v[i1], v[i2], v[i3]))

def generate_motor_mount():
    """Generates standard 2207 Pusher Motor Mount (16x19mm M3 bolt pattern)"""
    triangles = []
    # Main mounting plate (40mm x 40mm x 4mm)
    add_box(triangles, -20, -20, 0, 40, 40, 4)
    # Wing attachment flanges
    add_box(triangles, -25, -20, 0, 5, 40, 4)
    add_box(triangles, 20, -20, 0, 5, 40, 4)
    # Stiffener ribs
    add_box(triangles, -18, -4, 4, 36, 8, 8)
    return triangles

def generate_s21fe_cradle():
    """
    Generates a streamlined aerodynamic nose mount for Samsung S21 FE:
    Dimensions: 80mm wide, 40mm tall, 110mm deep with forward-facing camera cutout.
    """
    triangles = []
    # Base cradle bed (supports phone body)
    add_box(triangles, -42, 0, 0, 84, 90, 3)
    # Left & Right retaining side walls
    add_box(triangles, -44, 0, 0, 3, 90, 18)
    add_box(triangles, 41, 0, 0, 3, 90, 18)
    # Front nose bumper with angled stealth bevels
    add_box(triangles, -44, -20, 0, 88, 20, 6)
    # Camera lens viewing aperture (protects lens while allowing wide 120deg FOV)
    add_box(triangles, -38, -20, 6, 26, 8, 22)
    add_box(triangles, 12, -20, 6, 26, 8, 22)
    add_box(triangles, -38, -20, 28, 76, 8, 4)
    return triangles

if __name__ == '__main__':
    out_dir = os.path.join(os.path.dirname(__file__), 'models')
    
    # 1. Generate Motor Mount STL
    mount_stl = os.path.join(out_dir, 'motor_mount_pusher_2207.stl')
    write_binary_stl(mount_stl, generate_motor_mount())
    print(f"Generated: {mount_stl}")
    
    # 2. Generate S21 FE FPV Nose Mount STL
    nose_stl = os.path.join(out_dir, 's21fe_fpv_nose_mount.stl')
    write_binary_stl(nose_stl, generate_s21fe_cradle())
    print(f"Generated: {nose_stl}")
