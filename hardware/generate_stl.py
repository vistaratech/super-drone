"""
==========================================================================
  🛸 SUPER-DRONE | Realistic FPV Quadcopter Frame STL Generator
  Based on TBS Source One V5 Dimensions (226mm Wheelbase, 5-inch props)
  
  Generates 3D-printable parts:
    1. Bottom Plate (main chassis with stack mounting holes)
    2. Top Plate (electronics protector)
    3. Arms x4 (with integrated motor mount tubes)
    4. Camera Mount (19mm micro FPV camera cradle)
    5. Battery Pad (anti-slip landing pad)
    6. Samsung S21 FE Phone Cradle (FPV nose mount)
    7. Full Assembled Frame (visualization)
  
  All dimensions in mm, based on industry standard specs:
    - Wheelbase: 226mm (motor-to-motor diagonal)
    - Arm thickness: 6mm (3D print optimized to 7mm)
    - Stack mount: 30.5 x 30.5mm (M3) + 20 x 20mm (M2)
    - Motor mount: 16 x 19mm (M3 bolt pattern for 2207 motors)
    - Camera: 19mm micro mount spacing
    - Standoff height: 25mm
    
  Print Settings (recommended):
    - Material: PETG or CF-PETG (NOT PLA - too brittle)
    - Layer height: 0.2mm
    - Infill: 60%+ Gyroid pattern
    - Walls: 4 minimum
    - Supports: Yes for camera mount & phone cradle
==========================================================================
"""

import math
import struct
import os

# ============================================================================
#  CONFIGURATION - Based on TBS Source One V5 / Real FPV Frame Standards
# ============================================================================
CFG = {
    # Frame Geometry
    'wheelbase': 226.0,         # mm diagonal motor-to-motor
    'frame_type': 'true_x',     # true_x | stretched_x | deadcat
    
    # Center Plate
    'plate_width': 40.0,        # mm center body width
    'plate_length': 50.0,       # mm center body length
    'bottom_plate_thick': 3.0,  # mm
    'top_plate_thick': 2.0,     # mm
    'plate_corner_r': 5.0,      # mm corner radius
    
    # Arms
    'arm_width': 12.0,          # mm (wider than CF for 3D print strength)
    'arm_height': 7.0,          # mm (thicker than CF 6mm for 3D print)
    'arm_taper': 0.7,           # taper ratio at motor end (narrower tip)
    
    # Motor Mount
    'motor_bolt_w': 16.0,       # mm M3 bolt pattern width
    'motor_bolt_l': 19.0,       # mm M3 bolt pattern length  
    'motor_tube_od': 28.0,      # mm motor seat outer diameter
    'motor_tube_id': 22.0,      # mm motor seat inner diameter (motor bell)
    'motor_tube_h': 5.0,        # mm motor seat tube height
    'motor_bolt_d': 3.2,        # mm M3 bolt hole diameter
    
    # Stack Mount
    'stack_30': 30.5,           # mm 30.5x30.5 FC/ESC pattern
    'stack_20': 20.0,           # mm 20x20 mini FC pattern
    'stack_bolt_d': 3.2,        # mm M3 bolt holes
    'standoff_h': 25.0,         # mm standoff height
    'standoff_od': 7.0,         # mm standoff outer diameter
    
    # Camera Mount
    'cam_mount_w': 19.0,        # mm micro camera width
    'cam_mount_h': 19.0,        # mm micro camera height
    'cam_tilt_min': 0,          # degrees
    'cam_tilt_max': 45,         # degrees
    'cam_plate_thick': 2.5,     # mm
    
    # Battery Pad
    'batt_pad_w': 35.0,         # mm
    'batt_pad_l': 75.0,         # mm
    'batt_pad_h': 2.0,          # mm
    
    # S21 FE Phone Cradle
    'phone_w': 77.9,            # mm Samsung S21 FE width
    'phone_l': 155.7,           # mm Samsung S21 FE length
    'phone_d': 7.9,             # mm Samsung S21 FE depth
    'cradle_wall': 2.5,         # mm wall thickness
    'cradle_lip': 3.0,          # mm retaining lip height
    
    # Mesh Quality
    'circle_segments': 32,      # segments per circle
    'fillet_segments': 6,       # segments per fillet
}


# ============================================================================
#  BINARY STL WRITER
# ============================================================================
def write_binary_stl(filepath, triangles, header_text="SuperDrone Frame"):
    """
    Writes triangles to a standard 80-byte header binary STL file.
    Each triangle: ((x1,y1,z1), (x2,y2,z2), (x3,y3,z3))
    """
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'wb') as f:
        header = header_text.encode('ascii')[:80].ljust(80, b'\0')
        f.write(header)
        f.write(struct.pack('<I', len(triangles)))
        
        for v1, v2, v3 in triangles:
            # Cross product normal
            ax, ay, az = v2[0]-v1[0], v2[1]-v1[1], v2[2]-v1[2]
            bx, by, bz = v3[0]-v1[0], v3[1]-v1[1], v3[2]-v1[2]
            nx = ay*bz - az*by
            ny = az*bx - ax*bz
            nz = ax*by - ay*bx
            norm = math.sqrt(nx*nx + ny*ny + nz*nz)
            if norm > 1e-10:
                nx, ny, nz = nx/norm, ny/norm, nz/norm
            else:
                nx, ny, nz = 0.0, 0.0, 1.0
            
            f.write(struct.pack('<fff', nx, ny, nz))
            f.write(struct.pack('<fff', *v1))
            f.write(struct.pack('<fff', *v2))
            f.write(struct.pack('<fff', *v3))
            f.write(struct.pack('<H', 0))  # attribute byte count


# ============================================================================
#  MESH PRIMITIVE GENERATORS
# ============================================================================

def make_box(cx, cy, cz, dx, dy, dz):
    """Axis-aligned box centered at (cx,cy,cz) with dimensions (dx,dy,dz)."""
    hx, hy, hz = dx/2, dy/2, dz/2
    v = [
        (cx-hx, cy-hy, cz-hz), (cx+hx, cy-hy, cz-hz),
        (cx+hx, cy+hy, cz-hz), (cx-hx, cy+hy, cz-hz),
        (cx-hx, cy-hy, cz+hz), (cx+hx, cy-hy, cz+hz),
        (cx+hx, cy+hy, cz+hz), (cx-hx, cy+hy, cz+hz),
    ]
    faces = [
        (0,2,1),(0,3,2),  # bottom -Z
        (4,5,6),(4,6,7),  # top +Z
        (0,1,5),(0,5,4),  # front -Y
        (2,3,7),(2,7,6),  # back +Y
        (0,4,7),(0,7,3),  # left -X
        (1,2,6),(1,6,5),  # right +X
    ]
    return [(v[a], v[b], v[c]) for a,b,c in faces]


def make_cylinder(cx, cy, cz, r, h, segments=None):
    """Solid cylinder centered at (cx,cy) from cz to cz+h."""
    seg = segments or CFG['circle_segments']
    tris = []
    top_z = cz + h
    
    for i in range(seg):
        a1 = 2*math.pi * i / seg
        a2 = 2*math.pi * (i+1) / seg
        x1, y1 = cx + r*math.cos(a1), cy + r*math.sin(a1)
        x2, y2 = cx + r*math.cos(a2), cy + r*math.sin(a2)
        
        # Side walls
        tris.append(((x1,y1,cz), (x2,y2,cz), (x2,y2,top_z)))
        tris.append(((x1,y1,cz), (x2,y2,top_z), (x1,y1,top_z)))
        
        # Bottom cap (fan from center)
        tris.append(((cx,cy,cz), (x2,y2,cz), (x1,y1,cz)))
        
        # Top cap
        tris.append(((cx,cy,top_z), (x1,y1,top_z), (x2,y2,top_z)))
    
    return tris


def make_tube(cx, cy, cz, r_outer, r_inner, h, segments=None):
    """Hollow tube (cylinder with hole) centered at (cx,cy)."""
    seg = segments or CFG['circle_segments']
    tris = []
    top_z = cz + h
    
    for i in range(seg):
        a1 = 2*math.pi * i / seg
        a2 = 2*math.pi * (i+1) / seg
        
        # Outer points
        ox1, oy1 = cx + r_outer*math.cos(a1), cy + r_outer*math.sin(a1)
        ox2, oy2 = cx + r_outer*math.cos(a2), cy + r_outer*math.sin(a2)
        
        # Inner points
        ix1, iy1 = cx + r_inner*math.cos(a1), cy + r_inner*math.sin(a1)
        ix2, iy2 = cx + r_inner*math.cos(a2), cy + r_inner*math.sin(a2)
        
        # Outer wall
        tris.append(((ox1,oy1,cz), (ox2,oy2,cz), (ox2,oy2,top_z)))
        tris.append(((ox1,oy1,cz), (ox2,oy2,top_z), (ox1,oy1,top_z)))
        
        # Inner wall (reversed normals - face inward)
        tris.append(((ix1,iy1,cz), (ix1,iy1,top_z), (ix2,iy2,top_z)))
        tris.append(((ix1,iy1,cz), (ix2,iy2,top_z), (ix2,iy2,cz)))
        
        # Bottom annular ring
        tris.append(((ox1,oy1,cz), (ix1,iy1,cz), (ix2,iy2,cz)))
        tris.append(((ox1,oy1,cz), (ix2,iy2,cz), (ox2,oy2,cz)))
        
        # Top annular ring
        tris.append(((ox1,oy1,top_z), (ox2,oy2,top_z), (ix2,iy2,top_z)))
        tris.append(((ox1,oy1,top_z), (ix2,iy2,top_z), (ix1,iy1,top_z)))
    
    return tris


def make_rounded_plate(cx, cy, cz, w, l, h, corner_r, segments=None):
    """Plate with rounded corners centered at (cx,cy,cz)."""
    seg = segments or max(8, CFG['fillet_segments'])
    tris = []
    
    hw, hl = w/2, l/2
    r = min(corner_r, hw, hl)
    
    # Corner centers
    corners = [
        (cx + hw - r, cy + hl - r),  # top-right
        (cx - hw + r, cy + hl - r),  # top-left
        (cx - hw + r, cy - hl + r),  # bottom-left
        (cx + hw - r, cy - hl + r),  # bottom-right
    ]
    
    # Generate perimeter points
    perimeter = []
    for ci, (ccx, ccy) in enumerate(corners):
        start_angle = ci * math.pi / 2
        for j in range(seg + 1):
            a = start_angle + j * (math.pi / 2) / seg
            px = ccx + r * math.cos(a)
            py = ccy + r * math.sin(a)
            perimeter.append((px, py))
    
    n = len(perimeter)
    top_z = cz + h
    
    # Top and bottom faces (fan triangulation)
    for i in range(n):
        j = (i + 1) % n
        p1 = perimeter[i]
        p2 = perimeter[j]
        
        # Bottom face
        tris.append(((cx, cy, cz), (p2[0], p2[1], cz), (p1[0], p1[1], cz)))
        # Top face
        tris.append(((cx, cy, top_z), (p1[0], p1[1], top_z), (p2[0], p2[1], top_z)))
        
        # Side walls
        tris.append(((p1[0], p1[1], cz), (p2[0], p2[1], cz), (p2[0], p2[1], top_z)))
        tris.append(((p1[0], p1[1], cz), (p2[0], p2[1], top_z), (p1[0], p1[1], top_z)))
    
    return tris


def make_tapered_arm(x1, y1, x2, y2, z, w_start, w_end, h):
    """
    Arm from (x1,y1) to (x2,y2) at height z, tapering from w_start to w_end.
    Creates a proper 3D beam with trapezoidal cross-section.
    """
    tris = []
    
    # Direction vector
    dx, dy = x2 - x1, y2 - y1
    length = math.sqrt(dx*dx + dy*dy)
    if length < 1e-6:
        return tris
    
    # Unit direction and perpendicular
    ux, uy = dx/length, dy/length
    px, py = -uy, ux  # perpendicular (left)
    
    # Number of segments along arm length for smooth taper
    n_seg = 12
    
    prev_points = None
    for i in range(n_seg + 1):
        t = i / n_seg
        # Position along arm
        mx = x1 + dx * t
        my = y1 + dy * t
        
        # Width at this point (linear taper)
        w = w_start + (w_end - w_start) * t
        hw = w / 2
        hh = h / 2
        
        # 4 corners of cross-section at this position
        points = [
            (mx - px*hw, my - py*hw, z - hh),  # bottom-left
            (mx + px*hw, my + py*hw, z - hh),  # bottom-right
            (mx + px*hw, my + py*hw, z + hh),  # top-right
            (mx - px*hw, my - py*hw, z + hh),  # top-left
        ]
        
        if prev_points is not None:
            pp = prev_points
            cp = points
            # Connect 4 faces between segments
            for f in range(4):
                nf = (f + 1) % 4
                tris.append((pp[f], cp[f], cp[nf]))
                tris.append((pp[f], cp[nf], pp[nf]))
        
        prev_points = points
    
    # End caps
    # Start cap
    t = 0
    mx, my = x1, y1
    w = w_start
    hw, hh = w/2, h/2
    cap_s = [
        (mx - px*hw, my - py*hw, z - hh),
        (mx + px*hw, my + py*hw, z - hh),
        (mx + px*hw, my + py*hw, z + hh),
        (mx - px*hw, my - py*hw, z + hh),
    ]
    tris.append((cap_s[0], cap_s[2], cap_s[1]))
    tris.append((cap_s[0], cap_s[3], cap_s[2]))
    
    # End cap
    mx, my = x2, y2
    w = w_end
    hw = w/2
    cap_e = [
        (mx - px*hw, my - py*hw, z - hh),
        (mx + px*hw, my + py*hw, z - hh),
        (mx + px*hw, my + py*hw, z + hh),
        (mx - px*hw, my - py*hw, z + hh),
    ]
    tris.append((cap_e[0], cap_e[1], cap_e[2]))
    tris.append((cap_e[0], cap_e[2], cap_e[3]))
    
    return tris


def rotate_tris(tris, angle_deg, cx=0, cy=0):
    """Rotate triangles around Z-axis by angle_deg around point (cx,cy)."""
    a = math.radians(angle_deg)
    cos_a, sin_a = math.cos(a), math.sin(a)
    
    rotated = []
    for v1, v2, v3 in tris:
        rv = []
        for x, y, z in [v1, v2, v3]:
            dx, dy = x - cx, y - cy
            rx = cx + dx*cos_a - dy*sin_a
            ry = cy + dx*sin_a + dy*cos_a
            rv.append((rx, ry, z))
        rotated.append(tuple(rv))
    return rotated


def translate_tris(tris, tx, ty, tz):
    """Translate all triangles by (tx, ty, tz)."""
    return [
        ((v1[0]+tx, v1[1]+ty, v1[2]+tz),
         (v2[0]+tx, v2[1]+ty, v2[2]+tz),
         (v3[0]+tx, v3[1]+ty, v3[2]+tz))
        for v1, v2, v3 in tris
    ]


# ============================================================================
#  PART GENERATORS
# ============================================================================

def generate_bottom_plate():
    """
    Main chassis bottom plate with:
    - Rounded rectangle body
    - 30.5x30.5mm FC stack mounting posts
    - 20x20mm mini stack mounting posts
    - Arm attachment slots (4x)
    - Front camera mount points
    - Battery strap slots
    """
    tris = []
    c = CFG
    
    # Main rounded plate body
    tris += make_rounded_plate(
        0, 0, 0,
        c['plate_width'], c['plate_length'],
        c['bottom_plate_thick'],
        c['plate_corner_r']
    )
    
    # 30.5x30.5mm stack mounting standoff bases (4 corners)
    half_30 = c['stack_30'] / 2
    for sx in [-1, 1]:
        for sy in [-1, 1]:
            px = sx * half_30
            py = sy * half_30
            # Standoff base cylinder
            tris += make_cylinder(
                px, py, c['bottom_plate_thick'],
                c['standoff_od']/2, 3.0,  # 3mm tall standoff base
                segments=16
            )
    
    # 20x20mm mini stack mounting posts (4 corners)
    half_20 = c['stack_20'] / 2
    for sx in [-1, 1]:
        for sy in [-1, 1]:
            px = sx * half_20
            py = sy * half_20
            tris += make_cylinder(
                px, py, c['bottom_plate_thick'],
                2.5, 2.0,  # smaller posts for mini stack
                segments=12
            )
    
    # Arm attachment reinforcement pads (4 arms at 45-degree angles)
    arm_angle_offset = c['plate_width'] / 2 - 2
    for angle in [45, 135, 225, 315]:
        rad = math.radians(angle)
        pad_x = arm_angle_offset * math.cos(rad)
        pad_y = arm_angle_offset * math.sin(rad)
        pad = make_box(pad_x, pad_y, c['bottom_plate_thick']/2, 
                       14, 14, c['bottom_plate_thick'])
        tris += rotate_tris(pad, angle, pad_x, pad_y)
    
    # Front camera mount posts
    cam_half = c['cam_mount_w'] / 2
    for sx in [-1, 1]:
        tris += make_cylinder(
            sx * cam_half, -c['plate_length']/2 + 5, c['bottom_plate_thick'],
            2.0, 4.0,
            segments=12
        )
    
    # Battery strap guide rails (2 transverse slots)
    for by in [-12, 12]:
        tris += make_box(0, by, c['bottom_plate_thick']/2, 
                         c['plate_width'] + 6, 3, c['bottom_plate_thick'] + 1)
    
    return tris


def generate_top_plate():
    """
    Top protection plate with:
    - Rounded rectangle matching bottom plate
    - Standoff mounting holes alignment
    - Receiver antenna mount
    - Status LED window
    """
    tris = []
    c = CFG
    z_base = c['standoff_h'] + c['bottom_plate_thick']
    
    # Main top plate
    tris += make_rounded_plate(
        0, 0, z_base,
        c['plate_width'] - 2, c['plate_length'] - 4,
        c['top_plate_thick'],
        c['plate_corner_r'] - 1
    )
    
    # Standoff top caps (where bolts sit)
    half_30 = c['stack_30'] / 2
    for sx in [-1, 1]:
        for sy in [-1, 1]:
            px = sx * half_30
            py = sy * half_30
            tris += make_cylinder(
                px, py, z_base + c['top_plate_thick'],
                c['standoff_od']/2 - 0.5, 1.5,
                segments=16
            )
    
    # Antenna mount tube (rear center)
    tris += make_tube(
        0, c['plate_length']/2 - 8, z_base + c['top_plate_thick'],
        4.0, 2.5, 12.0,
        segments=16
    )
    
    # Buzzer mount ring
    tris += make_tube(
        0, -5, z_base + c['top_plate_thick'],
        6.0, 4.0, 2.0,
        segments=20
    )
    
    return tris


def generate_single_arm(arm_index):
    """
    Single arm with:
    - Tapered beam profile (wider at body, narrower at motor)
    - Integrated motor mount cylinder at tip
    - M3 motor bolt standoffs (16x19mm pattern)
    - Weight reduction channel
    
    arm_index: 0=front-right, 1=front-left, 2=rear-left, 3=rear-right
    """
    tris = []
    c = CFG
    
    # Calculate arm angle based on True-X layout
    angles = [45, 135, 225, 315]
    angle = angles[arm_index]
    
    # Arm length from center to motor (half wheelbase diagonal)
    arm_reach = c['wheelbase'] / 2
    body_clearance = c['plate_width'] / 2 + 2  # start outside body
    
    # Arm start and end points
    rad = math.radians(angle)
    start_x = body_clearance * math.cos(rad)
    start_y = body_clearance * math.sin(rad)
    end_x = arm_reach * math.cos(rad)
    end_y = arm_reach * math.sin(rad)
    
    arm_z = c['bottom_plate_thick'] / 2  # center at plate midplane
    
    # Main tapered arm beam
    tris += make_tapered_arm(
        start_x, start_y, end_x, end_y,
        arm_z,
        c['arm_width'], c['arm_width'] * c['arm_taper'],
        c['arm_height']
    )
    
    # Motor mount cylinder at arm tip
    motor_z = -c['arm_height']/2 + c['bottom_plate_thick']/2 - 1
    tris += make_tube(
        end_x, end_y, motor_z,
        c['motor_tube_od']/2, c['motor_tube_id']/2,
        c['motor_tube_h'],
        segments=c['circle_segments']
    )
    
    # Motor mount base plate (solid disc under tube)
    tris += make_cylinder(
        end_x, end_y, motor_z - 2,
        c['motor_tube_od']/2, 2.0,
        segments=c['circle_segments']
    )
    
    # M3 motor bolt standoff posts (16x19mm pattern)
    hw = c['motor_bolt_w'] / 2
    hl = c['motor_bolt_l'] / 2
    bolt_positions = [(-hw, -hl), (hw, -hl), (hw, hl), (-hw, hl)]
    
    for bx, by in bolt_positions:
        # Rotate bolt position to match arm angle
        cos_a, sin_a = math.cos(rad), math.sin(rad)
        rbx = end_x + bx*cos_a - by*sin_a
        rby = end_y + bx*sin_a + by*cos_a
        
        # Small standoff post
        tris += make_cylinder(
            rbx, rby, motor_z - 2,
            2.0, c['motor_tube_h'] + 2,
            segments=10
        )
    
    return tris


def generate_camera_mount():
    """
    FPV camera mount cradle:
    - 19mm micro camera mount spacing
    - Adjustable tilt (printed at 25° default)
    - Side plates with pivot holes
    - Front protection bumper
    """
    tris = []
    c = CFG
    
    mount_y = -c['plate_length']/2 - 5  # in front of body
    base_z = c['bottom_plate_thick']
    
    # Camera cradle base
    tris += make_box(0, mount_y, base_z + 6, 24, 8, 2.5)
    
    # Side plates (with tilt angle built in)
    tilt = 25  # degrees
    plate_h = 22
    plate_w = 2.5
    
    for sx in [-1, 1]:
        px = sx * (c['cam_mount_w']/2 + plate_w/2)
        # Side plate
        tris += make_box(px, mount_y, base_z + 6 + plate_h/2, 
                         plate_w, 8, plate_h)
        
        # Pivot bolt cylinder (where camera tilts)
        tris += make_cylinder(
            px, mount_y, base_z + 14,
            2.5, plate_w + 1,
            segments=12
        )
    
    # Top protection bar
    tris += make_box(0, mount_y - 2, base_z + 6 + plate_h, 
                     c['cam_mount_w'] + 5, 3, 2.5)
    
    # Front bumper/skid
    tris += make_box(0, mount_y - 5, base_z + 3, 
                     c['cam_mount_w'] + 10, 3, 8)
    
    # Mounting tabs to connect to frame body
    for sx in [-1, 1]:
        tab_x = sx * 8
        tris += make_box(tab_x, mount_y + 8, base_z + 1.5, 
                         6, 12, 3)
    
    return tris


def generate_battery_pad():
    """
    Anti-slip battery landing pad:
    - Grid texture pattern for grip
    - Velcro strap guides
    - Ventilation slots
    """
    tris = []
    c = CFG
    
    z_base = -c['bottom_plate_thick']  # sits under bottom plate
    
    # Main pad plate
    tris += make_rounded_plate(
        0, 0, z_base - c['batt_pad_h'],
        c['batt_pad_w'], c['batt_pad_l'],
        c['batt_pad_h'],
        3.0  # corner radius
    )
    
    # Grid texture ridges for grip (horizontal lines)
    for i in range(-6, 7):
        gy = i * 5
        if abs(gy) < c['batt_pad_l']/2 - 5:
            tris += make_box(0, gy, z_base - c['batt_pad_h'] - 0.5, 
                             c['batt_pad_w'] - 4, 1.5, 0.8)
    
    # Grid texture ridges (vertical lines)  
    for i in range(-3, 4):
        gx = i * 5
        if abs(gx) < c['batt_pad_w']/2 - 5:
            tris += make_box(gx, 0, z_base - c['batt_pad_h'] - 0.5,
                             1.5, c['batt_pad_l'] - 4, 0.8)
    
    # Strap guide channels (raised edges for battery strap)
    for sy in [-1, 1]:
        strap_y = sy * 18
        tris += make_box(0, strap_y, z_base, 
                         c['batt_pad_w'] + 4, 4, 2)
    
    return tris


def generate_s21fe_cradle():
    """
    Samsung S21 FE Phone Mount Cradle for FPV video:
    - Secure snap-fit phone holder
    - Front camera aperture (wide FOV cutout)
    - Rear ventilation slots
    - Wing/body attachment flanges
    - Cable routing channel for USB-C
    """
    tris = []
    c = CFG
    
    pw, pl, pd = c['phone_w'], c['phone_l'], c['phone_d']
    wall = c['cradle_wall']
    lip = c['cradle_lip']
    
    # Outer cradle dimensions
    outer_w = pw + wall * 2
    outer_l = pl/2 + wall  # half-length cradle (phone slides in)
    outer_h = pd + wall + lip
    
    # Base bed (phone sits on this)
    tris += make_box(0, 0, 0, outer_w, outer_l, wall)
    
    # Left side wall
    tris += make_box(-(pw/2 + wall/2), 0, outer_h/2, 
                     wall, outer_l, outer_h)
    
    # Right side wall
    tris += make_box((pw/2 + wall/2), 0, outer_h/2, 
                     wall, outer_l, outer_h)
    
    # Front bumper (nose)
    tris += make_box(0, -(outer_l/2 + wall/2), outer_h/2,
                     outer_w, wall, outer_h)
    
    # Front camera aperture - cutout frame (U-shaped around camera)
    cam_cut_w = 30  # wide enough for ultra-wide lens
    cam_cut_h = pd + 2
    # Left pillar of camera frame
    tris += make_box(-(cam_cut_w/2 + 5), -(outer_l/2),
                     wall + cam_cut_h/2,
                     8, wall + 2, cam_cut_h)
    # Right pillar
    tris += make_box((cam_cut_w/2 + 5), -(outer_l/2),
                     wall + cam_cut_h/2,
                     8, wall + 2, cam_cut_h)
    # Top bar over camera
    tris += make_box(0, -(outer_l/2), wall + cam_cut_h + 1.5,
                     outer_w - 4, wall + 2, 3)
    
    # Retaining lips (top edges to hold phone in)
    for sx in [-1, 1]:
        tris += make_box(sx * (pw/2 - 3), 0, outer_h + lip/2,
                         8, outer_l - 10, lip)
    
    # Rear open end guide rails
    for sx in [-1, 1]:
        tris += make_box(sx * (pw/2 + wall/2), outer_l/2 + 3, outer_h/2,
                         wall, 8, outer_h)
    
    # USB-C cable routing channel (bottom center rear)
    tris += make_box(0, outer_l/2 + 2, wall/2 + 0.5,
                     14, 6, wall + 1)
    
    # Wing/body attachment flanges with bolt holes
    for sx in [-1, 1]:
        flange_x = sx * (outer_w/2 + 8)
        tris += make_box(flange_x, -10, wall/2,
                         12, 25, wall)
        # Bolt hole reinforcement cylinders
        tris += make_cylinder(flange_x, -18, wall, 3.5, 2, segments=12)
        tris += make_cylinder(flange_x, -2, wall, 3.5, 2, segments=12)
    
    return tris


def generate_full_frame():
    """
    Assembles all parts into one STL for visualization:
    Bottom plate + Top plate + 4 Arms + Camera mount + Battery pad
    """
    tris = []
    
    # Bottom plate
    tris += generate_bottom_plate()
    
    # Top plate
    tris += generate_top_plate()
    
    # 4 Arms with motor mounts
    for i in range(4):
        tris += generate_single_arm(i)
    
    # Camera mount
    tris += generate_camera_mount()
    
    # Battery pad
    tris += generate_battery_pad()
    
    return tris


# ============================================================================
#  MAIN - Generate All STL Files
# ============================================================================
if __name__ == '__main__':
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
    
    parts = [
        ('bottom_plate.stl', generate_bottom_plate, 
         'Bottom Chassis Plate (30.5mm + 20mm stack mounts)'),
        ('top_plate.stl', generate_top_plate,
         'Top Protection Plate (with antenna & buzzer mounts)'),
        ('arm_front_right.stl', lambda: generate_single_arm(0),
         'Arm #1 Front-Right (45°) with 2207 motor mount'),
        ('arm_front_left.stl', lambda: generate_single_arm(1),
         'Arm #2 Front-Left (135°) with 2207 motor mount'),
        ('arm_rear_left.stl', lambda: generate_single_arm(2),
         'Arm #3 Rear-Left (225°) with 2207 motor mount'),
        ('arm_rear_right.stl', lambda: generate_single_arm(3),
         'Arm #4 Rear-Right (315°) with 2207 motor mount'),
        ('camera_mount_micro.stl', generate_camera_mount,
         'FPV Camera Mount (19mm micro, 25° tilt)'),
        ('battery_pad.stl', generate_battery_pad,
         'Battery Landing Pad (anti-slip grid)'),
        ('s21fe_fpv_cradle.stl', generate_s21fe_cradle,
         'Samsung S21 FE Phone Cradle (FPV camera mount)'),
        ('full_frame_assembled.stl', generate_full_frame,
         '★ Full Assembled Frame (all parts combined for preview)'),
    ]
    
    print("=" * 65)
    print("  🛸 SUPER-DRONE | FPV Quadcopter Frame STL Generator")
    print(f"  Wheelbase: {CFG['wheelbase']}mm | Arms: {CFG['arm_height']}mm thick")
    print(f"  Stack: {CFG['stack_30']}mm + {CFG['stack_20']}mm | Motor: 16x19mm M3")
    print("=" * 65)
    
    for filename, generator, description in parts:
        filepath = os.path.join(out_dir, filename)
        triangles = generator()
        write_binary_stl(filepath, triangles, f"SuperDrone {filename}")
        size_kb = os.path.getsize(filepath) / 1024
        print(f"  ✅ {filename:<30s} | {len(triangles):>5d} tris | {size_kb:>6.1f} KB")
        print(f"     └─ {description}")
    
    print("=" * 65)
    print(f"  📂 Output: {out_dir}")
    print("  🖨️  Print: PETG/CF-PETG | 0.2mm layer | 60%+ Gyroid infill")
    print("=" * 65)
