#!/usr/bin/env python3
"""Extract research frames from locally supplied videos; never downloads media.
Requires ffmpeg/ffprobe and Pillow. Original media is not copied to the repository.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw


def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--attachments-root', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    manifest = []
    media = {}
    for part in range(1, 6):
        matches = list(args.attachments_root.rglob(f'H3-part-{part:02d}.mp4'))
        if len(matches) != 1:
            raise SystemExit(f'Expected one part {part}; found {len(matches)}')
        source = matches[0]
        probe = json.loads(run(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(source)]))
        stream = next(s for s in probe['streams'] if s['codec_type'] == 'video')
        if stream['avg_frame_rate'] != '30/1' or stream['start_time'] != '0.000000':
            raise SystemExit('Frame-index timing assumptions changed; review source before extraction')
        pts_lines = run(['ffprobe','-v','error','-select_streams','v:0',
                         '-show_entries','frame=best_effort_timestamp_time',
                         '-of','csv=p=0',str(source)]).splitlines()
        pts = [float(line.split(',')[0]) for line in pts_lines if line.split(',')[0].strip()]
        max_pts_error = max(abs(t-i/30) for i,t in enumerate(pts))
        if len(pts) != int(stream['nb_frames']) or max_pts_error > 0.00001:
            raise SystemExit('Nonuniform frame timing; use actual PTS instead of n/30')
        # Full video-stream decode. No audio interpretation or playback-speed inference.
        run(['ffmpeg', '-v', 'error', '-i', str(source), '-map', '0:v:0', '-f', 'null', '-'])
        media[part] = source
        manifest.append({
            'source_id': f'UP-H3-{part:02d}', 'filename': source.name,
            'local_source_path': str(source), 'bytes': source.stat().st_size,
            'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'format_duration_seconds': float(probe['format']['duration']),
            'stream': {k: stream.get(k) for k in ['codec_name','width','height','r_frame_rate','avg_frame_rate','time_base','nb_frames','start_time']},
            'full_video_decode': 'passed', 'verified_pts_count': len(pts),
            'max_pts_error_seconds_vs_n_over_30': max_pts_error, 'original_capture_fps': None,
            'original_playback_speed': None, 'original_type_plate_verified': False,
            'rights_to_publish_media': 'not_established',
        })
    windows = [
        ('roller-right', 2, 2790, 2853, 9),
        ('roller-left', 3, 2724, 2823, 9),
        ('roller-lift', 4, 1002, 1092, 9),
        ('roller-end', 4, 1065, 1098, 3),
        ('wings', 2, 2910, 2949, 3),
        ('bat', 3, 1998, 2028, 3),
    ]
    all_frames = []
    for label, part, first, last, step in windows:
        directory = args.output / label
        directory.mkdir(exist_ok=True)
        indices = list(range(first, last + 1, step))
        # Select by decoded original frame index, without fps interpolation or AI enhancement.
        expression = f'select=between(n\\,{first}\\,{last})*not(mod(n-{first}\\,{step}))'
        run(['ffmpeg', '-v', 'error', '-i', str(media[part]), '-vf', expression,
             '-vsync', '0', str(directory / 'frame-%03d.png')])
        frames = sorted(directory.glob('frame-*.png'))
        if len(frames) != len(indices):
            raise SystemExit(f'Frame count mismatch in {label}')
        columns = 3
        sheet = Image.new('RGB', (1920, ((len(frames)+2)//3)*384), (20,20,20))
        draw = ImageDraw.Draw(sheet)
        for i, (frame, n) in enumerate(zip(frames, indices)):
            x, y = i % columns * 640, i // columns * 384
            sheet.paste(Image.open(frame), (x, y+24))
            draw.text((x+6, y+4), f'UP-H3-{part:02d} frame={n} t={n/30:.3f}s', fill='white')
            all_frames.append({'sheet': f'{label}.jpg', 'source_id': f'UP-H3-{part:02d}',
                               'frame_index_zero_based': n, 'local_video_seconds': n/30})
        sheet.save(args.output / f'{label}.jpg', quality=92)
    # Manual image-space observations, not calibrated world coordinates.
    points = [(1,1998,213,207,5),(3,2004,229,219,5),(5,2010,280,234,5),
              (7,2016,338,244,8),(9,2022,366,230,5),(10,2025,377,205,5)]
    tracked = []
    overlay = Image.new('RGB', (1920,768), (20,20,20))
    labels = ImageDraw.Draw(overlay)
    for k,(index,n,x,y,error) in enumerate(points):
        im = Image.open(args.output/'bat'/f'frame-{index:03d}.png').convert('RGB')
        draw = ImageDraw.Draw(im)
        draw.ellipse((x-10,y-10,x+10,y+10),outline='cyan',width=1)
        xx,yy = k%3*640,k//3*384
        overlay.paste(im,(xx,yy+24))
        labels.text((xx+5,yy+4),f'n={n} t={n/30:.3f}s manual ({x},{y}) px +/-{error}',fill='white')
        tracked.append({'source_id':'UP-H3-03','frame_index_zero_based':n,'local_video_seconds':n/30,
                        'x_pixels':x,'y_pixels':y,'estimated_position_error_pixels':error,
                        'method':'manual visual estimate; no lens or camera correction',
                        'visibility':'partly obscured by bat' if n==2016 else 'visible'})
    overlay.save(args.output/'manual-track.jpg',quality=92)
    (args.output/'manual-track.json').write_text(json.dumps(tracked,indent=2)+'\n')
    (args.output/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
    (args.output/'frame-index.json').write_text(json.dumps(all_frames, indent=2)+'\n')
    print(f'{len(manifest)} videos decoded; {len(all_frames)} indexed evidence frames extracted')

if __name__ == '__main__':
    main()
