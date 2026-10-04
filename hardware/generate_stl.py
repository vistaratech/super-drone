"""
==========================================================================
  ✈️ SUPER-WING 5G | Stealth Delta Flying Wing STL Generator
  
  Generates 3D-printable fuselage/structural parts for a stealth
  delta flying wing UAV, inspired by B-2 Spirit / X-47B / nEUROn
  
  Wing Specifications (from BOM):
    - Wingspan: 900mm (medium delta)
    - Root chord: 450mm
    - Tip chord: 80mm  
    - Sweep angle: ~35 degrees
    - Airframe: EPP foam core with 3D carbon fiber vinyl wrap
    - Propulsion: 1x 2207 brushless pusher motor (rear)
    - Control: 2x MG90S elevon servos
    - FPV: Samsung S21 FE phone in nose cradle
    - Electronics: ESP32 Super Mini + MPU-6050 IMU
  
  Generated Parts:
    1. Fuselage Center Body (main avionics bay)
    2. Nose Cone (stealth faceted, S21 FE camera window)
    3. Motor Mount Bulkhead (rear pusher, 2207 M3 pattern)
    4. Wing Root Ribs (structural, left + right)
    5. Elevon Servo Mount (2x, for MG90S servos)
    6. Battery Sled (4S 18650 Li-Ion tray)
    7. ESP32 + MPU-6050 Avionics Tray
    8. Full Assembly Preview
  
  Design Philosophy:
    - Stealth angular facets on all surfaces (no curves on exterior)
    - Sharp leading edges with planform alignment
    - Internal electronics bay with access hatch
    - Interlocking tabs for carbon fiber spar pass-through
    - All parts designed to bond into EPP foam wing core
  
  Print Settings:
    - Material: LW-PLA (lightweight) or PETG
    - Layer: 0.2mm
    - Infill: 20% for LW-PLA, 40% for PETG
    - Walls: 3
==========================================================================
"""

import math
import struct
import os

# ============================================================================
#  CONFIGURATION — Based on Real Delta Wing UAV Dimensions
# ============================================================================
CFG = {
    # Overall Wing Planform
    'wingspan': 900.0,            # mm total wingspan
    'root_chord': 450.0,          # mm chord at centerline
    'tip_chord': 80.0,            # mm chord at wingtip
    'sweep_angle': 35.0,          # degrees leading edge sweep
    'wing_thickness_root': 45.0,  # mm max thickness at root (10% t/c ratio)
    'wing_thickness_tip': 12.0,   # mm thickness at tip
    
    # Fuselage Center Body
    'fuse_length': 500.0,         # mm nose to tail
    'fuse_width': 120.0,          # mm at widest (blended into wing)
    'fuse_height': 55.0,          # mm max height
    'fuse_wall': 2.5,             # mm wall thickness
    
    # Nose Section
    'nose_length': 160.0,         # mm from front tip to fuselage start
    'nose_facets': 6,             # number of stealth facets
    
    # Motor Mount
    'motor_bolt_w': 16.0,         # mm M3 bolt pattern
    'motor_bolt_l': 19.0,         # mm M3 bolt pattern
    'motor_bolt_d': 3.2,          # mm M3 hole diameter
    'motor_mount_dia': 30.0,      # mm motor mount ring OD
    
    # Samsung S21 FE 
    'phone_w': 77.9,              # mm
    'phone_l': 155.7,             # mm  
    'phone_d': 7.9,               # mm
    
    # Servos (MG90S)
    'servo_w': 12.5,              # mm
    'servo_l': 23.0,              # mm
    'servo_h': 29.0,              # mm
    'servo_tab_w': 32.5,          # mm with mounting tabs
    
    # Battery (4S 18650)
    'cell_dia': 18.5,             # mm 18650 diameter
    'cell_len': 65.0,             # mm 18650 length
    'batt_cells': 4,              # 4S configuration
    
    # ESP32 + MPU board
    'esp32_w': 18.0,              # mm ESP32 Super Mini
    'esp32_l': 25.4,              # mm
    'mpu_w': 16.0,                # mm MPU-6050 breakout
    'mpu_l': 21.0,                # mm
    
    # Mesh Quality
    'segments': 24,
}


# ============================================================================
#  BINARY STL WRITER
# ============================================================================
def write_binary_stl(filepath, triangles, header_text="SuperWing STL"):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'wb') as f:
        header = header_text.encode('ascii')[:80].ljust(80, b'\0')
        f.write(header)
        f.write(struct.pack('<I', len(triangles)))
        
        for v1, v2, v3 in triangles:
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
            f.write(struct.pack('<H', 0))


# ============================================================================
#  MESH PRIMITIVES
# ============================================================================

def make_box(cx, cy, cz, dx, dy, dz):
    """Box centered at (cx,cy,cz) with dims (dx,dy,dz)."""
    hx, hy, hz = dx/2, dy/2, dz/2
    v = [
        (cx-hx, cy-hy, cz-hz), (cx+hx, cy-hy, cz-hz),
        (cx+hx, cy+hy, cz-hz), (cx-hx, cy+hy, cz-hz),
        (cx-hx, cy-hy, cz+hz), (cx+hx, cy-hy, cz+hz),
        (cx+hx, cy+hy, cz+hz), (cx-hx, cy+hy, cz+hz),
    ]
    faces = [
        (0,2,1),(0,3,2), (4,5,6),(4,6,7),
        (0,1,5),(0,5,4), (2,3,7),(2,7,6),
        (0,4,7),(0,7,3), (1,2,6),(1,6,5),
    ]
    return [(v[a], v[b], v[c]) for a,b,c in faces]


def make_cylinder(cx, cy, cz, r, h, segments=24):
    tris = []
    top_z = cz + h
    for i in range(segments):
        a1 = 2*math.pi * i / segments
        a2 = 2*math.pi * (i+1) / segments
        x1, y1 = cx + r*math.cos(a1), cy + r*math.sin(a1)
        x2, y2 = cx + r*math.cos(a2), cy + r*math.sin(a2)
        tris.append(((x1,y1,cz), (x2,y2,cz), (x2,y2,top_z)))
        tris.append(((x1,y1,cz), (x2,y2,top_z), (x1,y1,top_z)))
        tris.append(((cx,cy,cz), (x2,y2,cz), (x1,y1,cz)))
        tris.append(((cx,cy,top_z), (x1,y1,top_z), (x2,y2,top_z)))
    return tris


def make_tube(cx, cy, cz, r_out, r_in, h, segments=24):
    tris = []
    top_z = cz + h
    for i in range(segments):
        a1 = 2*math.pi * i / segments
        a2 = 2*math.pi * (i+1) / segments
        ox1, oy1 = cx + r_out*math.cos(a1), cy + r_out*math.sin(a1)
        ox2, oy2 = cx + r_out*math.cos(a2), cy + r_out*math.sin(a2)
        ix1, iy1 = cx + r_in*math.cos(a1), cy + r_in*math.sin(a1)
        ix2, iy2 = cx + r_in*math.cos(a2), cy + r_in*math.sin(a2)
        # Outer
        tris.append(((ox1,oy1,cz),(ox2,oy2,cz),(ox2,oy2,top_z)))
        tris.append(((ox1,oy1,cz),(ox2,oy2,top_z),(ox1,oy1,top_z)))
        # Inner
        tris.append(((ix1,iy1,cz),(ix1,iy1,top_z),(ix2,iy2,top_z)))
        tris.append(((ix1,iy1,cz),(ix2,iy2,top_z),(ix2,iy2,cz)))
        # Bottom ring
        tris.append(((ox1,oy1,cz),(ix1,iy1,cz),(ix2,iy2,cz)))
        tris.append(((ox1,oy1,cz),(ix2,iy2,cz),(ox2,oy2,cz)))
        # Top ring
        tris.append(((ox1,oy1,top_z),(ox2,oy2,top_z),(ix2,iy2,top_z)))
        tris.append(((ox1,oy1,top_z),(ix2,iy2,top_z),(ix1,iy1,top_z)))
    return tris


def make_quad(v0, v1, v2, v3):
    """Two triangles from 4 vertices (counter-clockwise)."""
    return [(v0, v1, v2), (v0, v2, v3)]


def make_polygon_face(vertices, cz, flip=False):
    """Fan-triangulate a polygon from center."""
    n = len(vertices)
    if n < 3:
        return []
    cx = sum(v[0] for v in vertices) / n
    cy = sum(v[1] for v in vertices) / n
    center = (cx, cy, cz)
    tris = []
    for i in range(n):
        j = (i+1) % n
        if flip:
            tris.append((center, (vertices[j][0], vertices[j][1], cz),
                         (vertices[i][0], vertices[i][1], cz)))
        else:
            tris.append((center, (vertices[i][0], vertices[i][1], cz),
                         (vertices[j][0], vertices[j][1], cz)))
    return tris


# ============================================================================
#  STEALTH WING PROFILE GENERATOR
# ============================================================================

def get_stealth_profile(y_station, half_span, root_chord, tip_chord, 
                        sweep_rad, root_thick, tip_thick):
    """
    Returns the cross-section profile at a given spanwise station y.
    Profile is a stealth-faceted diamond shape (6-sided hexagonal airfoil).
    
    Returns: (leading_edge_x, trailing_edge_x, thickness, facet_vertices[])
    y_station: distance from centerline (0 = root, half_span = tip)
    """
    t = y_station / half_span  # 0..1
    
    # Chord at this station (linear taper)
    chord = root_chord + (tip_chord - root_chord) * t
    
    # Leading edge position (swept back)
    le_x = y_station * math.tan(sweep_rad)
    
    # Trailing edge position
    te_x = le_x + chord
    
    # Thickness at this station (linear taper)
    thick = root_thick + (tip_thick - root_thick) * t
    
    # Stealth diamond airfoil profile (6 facet points)
    # Top surface has angular facets (2 flat panels), bottom is flatter
    ht = thick / 2
    
    mid_x = le_x + chord * 0.35  # max thickness at 35% chord
    
    facets = [
        (le_x, 0),                      # 0: Leading edge (sharp point)
        (le_x + chord*0.15, ht*0.6),    # 1: Upper front facet
        (mid_x, ht),                     # 2: Upper peak (max thickness)
        (le_x + chord*0.70, ht*0.5),    # 3: Upper rear facet
        (te_x, 0),                       # 4: Trailing edge (sharp)
        (le_x + chord*0.70, -ht*0.3),   # 5: Lower rear
        (mid_x, -ht*0.45),              # 6: Lower peak
        (le_x + chord*0.15, -ht*0.35),  # 7: Lower front
    ]
    
    return facets


def loft_between_profiles(prof_a, y_a, prof_b, y_b):
    """
    Create triangulated surface between two airfoil profiles at different Y stations.
    Each profile is a list of (x, z) 2D points.
    """
    tris = []
    n = len(prof_a)
    assert len(prof_b) == n
    
    for i in range(n):
        j = (i + 1) % n
        
        # 4 corners of the quad
        v0 = (prof_a[i][0], y_a, prof_a[i][1])
        v1 = (prof_a[j][0], y_a, prof_a[j][1])
        v2 = (prof_b[j][0], y_b, prof_b[j][1])
        v3 = (prof_b[i][0], y_b, prof_b[i][1])
        
        tris += make_quad(v0, v1, v2, v3)
    
    return tris


def cap_profile(profile, y_station, flip=False):
    """Close an airfoil profile at a given Y station."""
    verts_3d = [(p[0], y_station, p[1]) for p in profile]
    n = len(verts_3d)
    cx = sum(v[0] for v in verts_3d) / n
    cz = sum(v[2] for v in verts_3d) / n
    center = (cx, y_station, cz)
    
    tris = []
    for i in range(n):
        j = (i+1) % n
        if flip:
            tris.append((center, verts_3d[j], verts_3d[i]))
        else:
            tris.append((center, verts_3d[i], verts_3d[j]))
    return tris


# ============================================================================
#  PART GENERATORS
# ============================================================================

def generate_stealth_wing_body():
    """
    Complete stealth delta wing outer shell:
    - Swept leading edges aligned to single sweep angle (stealth planform)
    - Faceted diamond airfoil cross-sections (no curves = low RCS)
    - Blended wing body where fuselage merges into wing
    - Sharp trailing edge
    """
    c = CFG
    tris = []
    half_span = c['wingspan'] / 2
    sweep_rad = math.radians(c['sweep_angle'])
    
    # Generate wing surface by lofting between spanwise stations
    n_stations = 16  # number of spanwise sections
    
    # Right wing (Y = 0 to +half_span)
    for side in [1, -1]:  # +1 = right wing, -1 = left wing (mirrored)
        prev_profile = None
        prev_y = None
        
        for i in range(n_stations + 1):
            t = i / n_stations
            y = t * half_span
            
            profile = get_stealth_profile(
                y, half_span,
                c['root_chord'], c['tip_chord'],
                sweep_rad,
                c['wing_thickness_root'], c['wing_thickness_tip']
            )
            
            # Mirror for left wing
            actual_y = y * side
            
            if prev_profile is not None:
                if side == 1:
                    tris += loft_between_profiles(prev_profile, prev_y, 
                                                   profile, actual_y)
                else:
                    # For left wing, reverse winding
                    tris += loft_between_profiles(profile, actual_y,
                                                   prev_profile, prev_y)
            
            prev_profile = profile
            prev_y = actual_y
        
        # Cap the wingtip
        if side == 1:
            tris += cap_profile(profile, actual_y, flip=False)
        else:
            tris += cap_profile(profile, actual_y, flip=True)
    
    return tris


def generate_fuselage_bay():
    """
    Internal electronics bay (sits inside the wing center section):
    - Rectangular box with stealth-angled sides
    - Open top (access hatch)
    - Slots for carbon fiber spar pass-through
    - Battery bay and avionics tray mounting rails
    """
    c = CFG
    tris = []
    
    fw = c['fuse_width']
    fl = c['fuse_length']
    fh = c['fuse_height']
    wall = c['fuse_wall']
    
    # Outer shell (tapered hexagonal fuselage cross-section)
    # Front bulkhead position
    front_x = 80  # behind nose cone
    rear_x = front_x + fl
    
    # Cross-section: stealth faceted (hexagonal, wider at bottom)
    hw = fw / 2
    hh = fh / 2
    
    # 6-point fuselage cross-section (stealth angles)
    def fuse_section(x, scale=1.0):
        w = hw * scale
        h = hh * scale
        return [
            (x, -w * 0.5, h),           # top-left
            (x, w * 0.5, h),            # top-right
            (x, w, 0),                  # right
            (x, w * 0.7, -h * 0.8),    # bottom-right
            (x, -w * 0.7, -h * 0.8),   # bottom-left
            (x, -w, 0),                # left
        ]
    
    n_sections = 8
    prev_sec = None
    
    for i in range(n_sections + 1):
        t = i / n_sections
        x = front_x + fl * t
        
        # Taper towards front and rear
        if t < 0.2:
            scale = 0.6 + 0.4 * (t / 0.2)
        elif t > 0.8:
            scale = 0.6 + 0.4 * ((1.0 - t) / 0.2)
        else:
            scale = 1.0
        
        sec = fuse_section(x, scale)
        
        if prev_sec is not None:
            n = len(sec)
            for j in range(n):
                k = (j + 1) % n
                tris += make_quad(prev_sec[j], sec[j], sec[k], prev_sec[k])
        
        prev_sec = sec
    
    # Front bulkhead cap
    sec_front = fuse_section(front_x, 0.6)
    n = len(sec_front)
    cx_f = front_x
    cy_f = sum(p[1] for p in sec_front) / n
    cz_f = sum(p[2] for p in sec_front) / n
    for j in range(n):
        k = (j+1) % n
        tris.append(((cx_f, cy_f, cz_f), sec_front[k], sec_front[j]))
    
    # Rear bulkhead cap
    sec_rear = fuse_section(rear_x, 0.6)
    cx_r = rear_x
    cy_r = sum(p[1] for p in sec_rear) / n
    cz_r = sum(p[2] for p in sec_rear) / n
    for j in range(n):
        k = (j+1) % n
        tris.append(((cx_r, cy_r, cz_r), sec_rear[j], sec_rear[k]))
    
    # Internal mounting rails (2 parallel rails for avionics/battery)
    for sy in [-1, 1]:
        rail_y = sy * 25
        tris += make_box(front_x + fl/2, rail_y, -hh*0.5,
                         fl - 40, 4, 3)
    
    # Carbon fiber spar pass-through slots (reinforced holes in side walls)
    for sy in [-1, 1]:
        slot_y = sy * (hw - 5)
        tris += make_box(front_x + fl * 0.4, slot_y, 0,
                         15, 8, 12)
        tris += make_box(front_x + fl * 0.6, slot_y, 0,
                         15, 8, 12)
    
    return tris


def generate_nose_cone():
    """
    Stealth faceted nose cone:
    - Sharp pointed tip (low RCS)
    - Angular faceted surfaces (B-2 Spirit style)
    - Samsung S21 FE camera window cutout
    - Interlocks with fuselage bay
    """
    c = CFG
    tris = []
    
    nose_l = c['nose_length']
    
    # Nose tip (sharp point at X=0, Y=0, Z=0)
    tip = (0, 0, 2)  # slightly raised tip
    
    # Nose base cross-section (matches fuselage front)
    base_x = nose_l
    hw = c['fuse_width'] / 2 * 0.6
    hh = c['fuse_height'] / 2 * 0.6
    
    # Stealth faceted nose sections (progressively wider)
    sections = []
    n_sec = 8
    for i in range(n_sec + 1):
        t = i / n_sec
        x = nose_l * t
        
        # Stealth profile grows from point to fuselage width
        # Use power curve for aggressive taper
        s = t ** 0.65  # sharper initial taper
        w = hw * s
        h = hh * s
        
        if w < 1 or h < 1:
            sections.append(None)
            continue
        
        # Faceted cross-section (8-sided stealth polygon)
        sec = [
            (x, 0, h),                    # top center
            (x, w * 0.7, h * 0.7),        # top-right
            (x, w, 0),                    # right
            (x, w * 0.7, -h * 0.5),       # bottom-right
            (x, 0, -h * 0.6),             # bottom center
            (x, -w * 0.7, -h * 0.5),      # bottom-left
            (x, -w, 0),                   # left
            (x, -w * 0.7, h * 0.7),       # top-left
        ]
        sections.append(sec)
    
    # Connect tip to first valid section
    first_sec = None
    for s in sections:
        if s is not None:
            first_sec = s
            break
    
    if first_sec:
        for j in range(len(first_sec)):
            k = (j+1) % len(first_sec)
            tris.append((tip, first_sec[j], first_sec[k]))
    
    # Loft between sections
    prev_sec = first_sec
    for sec in sections[1:]:
        if sec is None:
            continue
        if prev_sec is not None:
            n = len(sec)
            for j in range(n):
                k = (j+1) % n
                tris += make_quad(prev_sec[j], sec[j], sec[k], prev_sec[k])
        prev_sec = sec
    
    # Rear face (mates with fuselage)
    if prev_sec:
        n = len(prev_sec)
        cx = prev_sec[0][0]
        cy = sum(p[1] for p in prev_sec) / n
        cz = sum(p[2] for p in prev_sec) / n
        for j in range(n):
            k = (j+1) % n
            tris.append(((cx, cy, cz), prev_sec[j], prev_sec[k]))
    
    # Camera window frame (rectangular cutout frame on bottom-front)
    cam_x = nose_l * 0.5
    cam_w = 30  # wide enough for S21 FE camera module
    cam_h = 15
    # Frame pillars
    for sy in [-1, 1]:
        tris += make_box(cam_x, sy * (cam_w/2 + 3), -hh*0.4,
                         20, 4, cam_h)
    # Top bar
    tris += make_box(cam_x, 0, -hh*0.4 + cam_h/2 + 1, 20, cam_w + 10, 3)
    # Bottom bar
    tris += make_box(cam_x, 0, -hh*0.4 - cam_h/2 - 1, 20, cam_w + 10, 3)
    
    return tris


def generate_motor_mount_bulkhead():
    """
    Rear pusher motor mount bulkhead:
    - 2207 brushless motor M3 bolt pattern (16x19mm)
    - Hollow motor tube for prop shaft clearance
    - Mounting flanges to bond into wing trailing edge
    - Cooling air channels
    """
    c = CFG
    tris = []
    
    # Bulkhead plate (vertical, at rear of fuselage)
    plate_w = 60
    plate_h = 45
    plate_t = 4
    
    tris += make_box(0, 0, 0, plate_t, plate_w, plate_h)
    
    # Motor mounting tube (centered)
    motor_r = c['motor_mount_dia'] / 2
    tris += make_tube(0, 0, 0, motor_r, motor_r - 4, plate_t + 6,
                      segments=CFG['segments'])
    
    # M3 motor bolt standoff posts (16x19mm pattern)
    hw = c['motor_bolt_w'] / 2
    hl = c['motor_bolt_l'] / 2
    for bx, by in [(-hw,-hl),(hw,-hl),(hw,hl),(-hw,hl)]:
        tris += make_cylinder(plate_t/2 + 2, bx, by, 2.5, 8, segments=10)
    
    # Wing attachment flanges (extend outward to bond into foam)
    for sy in [-1, 1]:
        flange_y = sy * (plate_w/2 + 10)
        tris += make_box(0, flange_y, 0, plate_t, 18, plate_h * 0.6)
        # Flange bolt hole reinforcement
        tris += make_cylinder(0, flange_y, plate_h*0.15, 3.5, plate_t,
                              segments=10)
    
    # Prop shaft center hole reinforcement ring
    tris += make_tube(plate_t + 3, 0, 0, 8, 5, 4, segments=16)
    
    # Cooling slots (raised guides that direct air)
    for sy in [-1, 1]:
        for i in range(3):
            slot_y = sy * (8 + i * 6)
            tris += make_box(plate_t + 1, slot_y, -plate_h*0.2,
                             2, 2, 10)
    
    return tris


def generate_wing_rib(side='right'):
    """
    Structural wing rib (inserts into foam wing at key stations):
    - Stealth diamond airfoil profile
    - Carbon fiber spar pass-through holes
    - Lightening holes for weight reduction
    - Servo wire channel
    
    side: 'right' (Y>0) or 'left' (Y<0)
    """
    c = CFG
    tris = []
    
    # Rib at 40% span station
    half_span = c['wingspan'] / 2
    y_station = half_span * 0.4
    sweep_rad = math.radians(c['sweep_angle'])
    
    profile = get_stealth_profile(
        y_station, half_span,
        c['root_chord'], c['tip_chord'],
        sweep_rad,
        c['wing_thickness_root'], c['wing_thickness_tip']
    )
    
    rib_thickness = 3.0  # mm
    
    # Create rib by extruding profile
    y_offset = y_station if side == 'right' else -y_station
    y1 = y_offset - rib_thickness/2
    y2 = y_offset + rib_thickness/2
    
    n = len(profile)
    
    # Side faces
    for i in range(n):
        j = (i+1) % n
        v0 = (profile[i][0], y1, profile[i][1])
        v1 = (profile[j][0], y1, profile[j][1])
        v2 = (profile[j][0], y2, profile[j][1])
        v3 = (profile[i][0], y2, profile[i][1])
        tris += make_quad(v0, v1, v2, v3)
    
    # Front face
    front_verts = [(p[0], y1, p[1]) for p in profile]
    n_f = len(front_verts)
    cx_f = sum(v[0] for v in front_verts)/n_f
    cz_f = sum(v[2] for v in front_verts)/n_f
    for i in range(n_f):
        j = (i+1) % n_f
        tris.append(((cx_f, y1, cz_f), front_verts[j], front_verts[i]))
    
    # Back face
    back_verts = [(p[0], y2, p[1]) for p in profile]
    for i in range(n_f):
        j = (i+1) % n_f
        tris.append(((cx_f, y2, cz_f), back_verts[i], back_verts[j]))
    
    # Carbon fiber spar pass-through tube (horizontal hole)
    spar_x = profile[0][0] + (profile[4][0] - profile[0][0]) * 0.35
    tris += make_tube(spar_x, y1 - 1, 0, 6, 4, rib_thickness + 2,
                      segments=12)
    
    # Lightening holes (cylinders punched through rib)
    for lt in [0.25, 0.55]:
        lh_x = profile[0][0] + (profile[4][0] - profile[0][0]) * lt
        lh_r = 8
        tris += make_cylinder(lh_x, y1, 0, lh_r, rib_thickness,
                              segments=12)
    
    return tris


def generate_elevon_servo_mount():
    """
    MG90S servo mount for elevon control surface:
    - Precise servo pocket
    - Pushrod exit hole
    - Mounting tabs to glue into wing trailing edge
    - Control horn alignment guide
    """
    c = CFG
    tris = []
    
    sw = c['servo_w']
    sl = c['servo_l']
    sh = c['servo_h']
    tab_w = c['servo_tab_w']
    
    # Servo pocket (box with open top)
    pocket_wall = 2.0
    
    # Bottom plate
    tris += make_box(0, 0, 0, 
                     sw + pocket_wall*2, sl + pocket_wall*2, pocket_wall)
    
    # Side walls
    for sx in [-1, 1]:
        wall_x = sx * (sw/2 + pocket_wall/2)
        tris += make_box(wall_x, 0, sh/2, 
                         pocket_wall, sl + pocket_wall*2, sh)
    
    # Front and rear walls
    for sy in [-1, 1]:
        wall_y = sy * (sl/2 + pocket_wall/2)
        tris += make_box(0, wall_y, sh/2, 
                         sw + pocket_wall*2, pocket_wall, sh)
    
    # Servo tab mounting shelf (the ears that the servo tabs rest on)
    tab_z = sh * 0.6
    tris += make_box(0, 0, tab_z, tab_w + 4, sl * 0.4, 2)
    
    # Wing mounting flanges (extend to sides for bonding into foam)
    for sx in [-1, 1]:
        flange_x = sx * (tab_w/2 + 12)
        tris += make_box(flange_x, 0, pocket_wall/2, 
                         20, sl + 10, pocket_wall)
    
    # Pushrod exit guide (small tube at rear)
    tris += make_tube(0, sl/2 + pocket_wall + 3, sh * 0.4,
                      3.5, 1.5, 6, segments=10)
    
    # Control horn alignment post
    tris += make_cylinder(0, -sl/2 - 5, 0, 2.0, sh + 5, segments=10)
    
    return tris


def generate_battery_sled():
    """
    4S 18650 Li-Ion battery tray:
    - 4 cell cradles in series configuration
    - Velcro strap guides
    - XT60 connector pocket
    - CG adjustment slots (slide fore/aft)
    """
    c = CFG
    tris = []
    
    cell_r = c['cell_dia'] / 2
    cell_l = c['cell_len']
    n_cells = c['batt_cells']
    
    # Tray base plate
    tray_w = cell_r * 2 * n_cells + 8
    tray_l = cell_l + 15
    tray_t = 2.0
    
    tris += make_box(0, 0, 0, tray_w, tray_l, tray_t)
    
    # Cell cradle dividers (walls between cells)
    for i in range(n_cells + 1):
        div_y = -tray_w/2 + cell_r*2*i + 4
        tris += make_box(0, div_y, tray_t + cell_r*0.4,
                         cell_l, 1.5, cell_r * 0.8)
    
    # Cell retention lips (top edges to prevent cells rolling out)
    for i in range(n_cells):
        cell_cy = -tray_w/2 + cell_r*(2*i+1) + 4
        for sx in [-1, 1]:
            lip_x = sx * (cell_l/2 - 3)
            tris += make_box(lip_x, cell_cy, tray_t + cell_r * 0.7,
                             8, cell_r * 1.4, 2)
    
    # Strap guides (raised channels for velcro)
    for sx in [-1, 1]:
        strap_x = sx * (cell_l/2 + 3)
        tris += make_box(strap_x, 0, tray_t + 1, 4, tray_w + 4, 3)
    
    # CG adjustment rail slots
    rail_spacing = 30
    for sx in [-1, 1]:
        rail_y = sx * (tray_w/2 + 3)
        tris += make_box(0, rail_y, tray_t/2, cell_l - 10, 3, tray_t)
        # Slot marks
        for i in range(-2, 3):
            mark_x = i * 10
            tris += make_box(mark_x, rail_y, tray_t, 2, 5, 1)
    
    # XT60 connector pocket (rear)
    tris += make_box(cell_l/2 + 2, 0, tray_t + 4, 14, 20, 8)
    
    return tris


def generate_avionics_tray():
    """
    ESP32 Super Mini + MPU-6050 mounting tray:
    - ESP32 mounting posts
    - MPU-6050 vibration-damped mount
    - Antenna clearance window
    - Wire routing channels
    """
    c = CFG
    tris = []
    
    # Base plate
    tray_w = 45
    tray_l = 55
    tray_t = 2.0
    
    tris += make_box(0, 0, 0, tray_w, tray_l, tray_t)
    
    # ESP32 mounting posts (4 corner posts)
    esp_hw = c['esp32_w'] / 2
    esp_hl = c['esp32_l'] / 2
    esp_offset_y = -8  # offset towards front
    
    for sx in [-1, 1]:
        for sy in [-1, 1]:
            px = sx * (esp_hw + 1)
            py = esp_offset_y + sy * (esp_hl + 1)
            tris += make_cylinder(px, py, tray_t, 2.0, 4.0, segments=8)
    
    # ESP32 platform shelf
    tris += make_box(0, esp_offset_y, tray_t + 3.5,
                     c['esp32_w'] + 4, c['esp32_l'] + 4, 1.0)
    
    # MPU-6050 mounting (slightly raised, centered for CG)
    mpu_offset_y = 12
    
    # Vibration damping posts (taller, thinner)
    for sx in [-1, 1]:
        for sy in [-1, 1]:
            px = sx * (c['mpu_w']/2 + 1)
            py = mpu_offset_y + sy * (c['mpu_l']/2 + 1)
            tris += make_cylinder(px, py, tray_t, 1.8, 6.0, segments=8)
    
    # MPU platform
    tris += make_box(0, mpu_offset_y, tray_t + 5.5,
                     c['mpu_w'] + 2, c['mpu_l'] + 2, 1.0)
    
    # Wire routing channels (recessed grooves)
    for sx in [-1, 1]:
        channel_x = sx * (tray_w/2 - 5)
        tris += make_box(channel_x, 0, tray_t + 0.5, 3, tray_l - 8, 1.5)
    
    # Fuselage mounting tabs
    for sy in [-1, 1]:
        tab_y = sy * (tray_l/2 + 5)
        tris += make_box(0, tab_y, tray_t/2, tray_w * 0.6, 8, tray_t)
        # Bolt hole
        tris += make_cylinder(0, tab_y, tray_t, 1.8, 2, segments=8)
    
    # Antenna keep-out zone marker (raised ring)
    tris += make_tube(tray_w/2 - 3, esp_offset_y, tray_t + 4,
                      5, 3, 2, segments=12)
    
    return tris


def generate_s21fe_nose_cradle():
    """
    Samsung S21 FE phone mount cradle for nose section:
    - Secure phone holder aligned with flight direction
    - Camera lens window (forward-facing, 120deg FOV)
    - USB-C port access for charging/OTG
    - Snap-fit retention with ejection slot
    """
    c = CFG
    tris = []
    
    pw, pd = c['phone_w'], c['phone_d']
    wall = 2.5
    lip = 2.5
    cradle_l = 85  # holds front portion of phone
    
    # Base bed
    tris += make_box(0, 0, 0, pw + wall*2, cradle_l, wall)
    
    # Side walls
    for sx in [-1, 1]:
        tris += make_box(sx * (pw/2 + wall/2), 0, (pd+lip)/2,
                         wall, cradle_l, pd + lip)
    
    # Front nose bumper (angled stealth profile)
    front_y = -(cradle_l/2 + wall)
    tris += make_box(0, front_y, (pd+lip)/2, pw + wall*2, wall*2, pd + lip)
    
    # Camera window opening frame
    cam_w = 32  # ultra-wide lens clearance
    cam_h = pd + 3
    for sx in [-1, 1]:
        tris += make_box(sx*(cam_w/2 + 5), front_y, cam_h/2 + 2,
                         8, wall*2 + 2, cam_h)
    tris += make_box(0, front_y, cam_h + 3, cam_w + 14, wall*2 + 2, 3)
    
    # Phone retention lips
    for sx in [-1, 1]:
        tris += make_box(sx * (pw/2 - 5), 0, pd + lip + wall/2,
                         12, cradle_l * 0.5, lip)
    
    # Stealth nose fairing (triangular front extension)
    fairing_l = 40
    nose_tip = (0, front_y - fairing_l, pd/2 + wall)
    # Left top edge
    lt = (-(pw/2 + wall), front_y, pd + lip)
    # Right top edge
    rt = ((pw/2 + wall), front_y, pd + lip)
    # Left bottom edge
    lb = (-(pw/2 + wall), front_y, 0)
    # Right bottom edge
    rb = ((pw/2 + wall), front_y, 0)
    
    # Top facet
    tris.append((nose_tip, lt, rt))
    # Bottom facet
    tris.append((nose_tip, rb, lb))
    # Left facet
    tris.append((nose_tip, lb, lt))
    # Right facet
    tris.append((nose_tip, rt, rb))
    
    # USB-C access slot (rear)
    rear_y = cradle_l/2 + 2
    tris += make_box(0, rear_y, wall + pd/2, 14, 4, pd)
    
    # Wing body mounting flanges
    for sx in [-1, 1]:
        fx = sx * (pw/2 + wall + 10)
        tris += make_box(fx, -10, wall/2, 15, 30, wall)
        tris += make_cylinder(fx, -20, wall, 3, 2, segments=10)
        tris += make_cylinder(fx, 0, wall, 3, 2, segments=10)
    
    return tris


def generate_full_assembly():
    """
    All parts assembled for preview visualization.
    """
    tris = []
    
    # Main wing body
    tris += generate_stealth_wing_body()
    
    # Nose cone (at front)
    tris += generate_nose_cone()
    
    # Fuselage bay (center)
    tris += generate_fuselage_bay()
    
    return tris


# ============================================================================
#  MAIN
# ============================================================================
if __name__ == '__main__':
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
    
    parts = [
        ('stealth_wing_body.stl', generate_stealth_wing_body,
         'Stealth Delta Wing Outer Shell (900mm span, faceted airfoil)'),
        ('fuselage_bay.stl', generate_fuselage_bay,
         'Internal Electronics Bay (hexagonal stealth fuselage)'),
        ('nose_cone_stealth.stl', generate_nose_cone,
         'Stealth Faceted Nose Cone (with camera window)'),
        ('motor_mount_pusher.stl', generate_motor_mount_bulkhead,
         'Rear Pusher Motor Bulkhead (2207 M3 bolt pattern)'),
        ('wing_rib_right.stl', lambda: generate_wing_rib('right'),
         'Structural Wing Rib - Right (40% span, spar holes)'),
        ('wing_rib_left.stl', lambda: generate_wing_rib('left'),
         'Structural Wing Rib - Left (40% span, spar holes)'),
        ('elevon_servo_mount.stl', generate_elevon_servo_mount,
         'MG90S Elevon Servo Mount (pushrod guide)'),
        ('battery_sled_4s.stl', generate_battery_sled,
         '4S 18650 Li-Ion Battery Tray (CG adjustable)'),
        ('avionics_tray.stl', generate_avionics_tray,
         'ESP32 + MPU-6050 Avionics Tray (vibration damped)'),
        ('s21fe_nose_cradle.stl', generate_s21fe_nose_cradle,
         'Samsung S21 FE Nose Cradle (FPV camera + stealth fairing)'),
        ('full_assembly.stl', generate_full_assembly,
         '* Full Stealth Wing Assembly (wing + nose + fuselage)'),
    ]
    
    print("=" * 70)
    print("  SUPER-WING 5G | Stealth Delta Flying Wing STL Generator")
    print(f"  Wingspan: {CFG['wingspan']}mm | Sweep: {CFG['sweep_angle']}deg")
    print(f"  Root Chord: {CFG['root_chord']}mm | Tip Chord: {CFG['tip_chord']}mm")
    print(f"  Motor: 2207 (16x19mm M3) | Servos: 2x MG90S Elevons")
    print("=" * 70)
    
    for filename, generator, description in parts:
        filepath = os.path.join(out_dir, filename)
        triangles = generator()
        write_binary_stl(filepath, triangles, f"SuperWing {filename}")
        size_kb = os.path.getsize(filepath) / 1024
        print(f"  OK {filename:<30s} | {len(triangles):>5d} tris | {size_kb:>6.1f} KB")
        print(f"      > {description}")
    
    print("=" * 70)
    print(f"  Output: {out_dir}")
    print("  Print: LW-PLA or PETG | 0.2mm layer | 20-40% infill")
    print("=" * 70)
