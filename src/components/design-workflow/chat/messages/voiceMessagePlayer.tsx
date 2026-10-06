import { formatAudioDuration } from '@/utils/workflow/chatHelpers';
import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
export const VoiceMessagePlayer = ({
	src,
	label,
	seed,
	compact = false,
}: {
	src: string;
	label: string;
	seed: string;
	compact?: boolean;
}) => {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [playing, setPlaying] = useState(false);
	const [duration, setDuration] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const bars = (() => {
		const base = Array.from(seed || src).reduce((total, char) => total + char.charCodeAt(0), 0);
		return Array.from({ length: 34 }, (_, index) => 8 + ((base + index * 13 + (index % 5) * 7) % 22));
	})();
	const progress = duration ? currentTime / duration : 0;
	const activeBars = Math.round(progress * bars.length);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;
		const syncTime = () => setCurrentTime(audio.currentTime);
		const syncDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
		const start = () => setPlaying(true);
		const stop = () => {
			setPlaying(false);
			if (audio.ended) setCurrentTime(0);
		};
		audio.addEventListener('timeupdate', syncTime);
		audio.addEventListener('loadedmetadata', syncDuration);
		audio.addEventListener('durationchange', syncDuration);
		audio.addEventListener('ended', stop);
		audio.addEventListener('pause', stop);
		audio.addEventListener('play', start);
		return () => {
			audio.removeEventListener('timeupdate', syncTime);
			audio.removeEventListener('loadedmetadata', syncDuration);
			audio.removeEventListener('durationchange', syncDuration);
			audio.removeEventListener('ended', stop);
			audio.removeEventListener('pause', stop);
			audio.removeEventListener('play', start);
		};
	}, [src]);

	const togglePlayback = async () => {
		const audio = audioRef.current;
		if (!audio) return;
		if (playing) {
			audio.pause();
			return;
		}
		setPlaying(true);
		await audio.play().catch(() => setPlaying(false));
	};

	const seek = (value: string) => {
		const audio = audioRef.current;
		if (!audio) return;
		const nextTime = Number(value);
		audio.currentTime = nextTime;
		setCurrentTime(nextTime);
	};

	return (
		<div className="workflow-chat-voice-player" data-playing={playing} data-compact={compact}>
			<button type="button" onClick={togglePlayback} aria-label={label}>
				{playing ? <Pause size={18} /> : <Play size={18} />}
			</button>
			<div className="workflow-chat-voice-track">
				<div className="workflow-chat-voice-waveform" aria-hidden="true">
					{bars.map((height, index) => (
						<span key={`${seed}-${index}`} data-active={index < activeBars} style={{ height }} />
					))}
				</div>
				<input
					type="range"
					min={0}
					max={duration || 0}
					step="0.1"
					value={duration ? currentTime : 0}
					onChange={(event) => seek(event.target.value)}
					aria-label={label}
				/>
				<small>{formatAudioDuration(playing ? currentTime : duration || currentTime)}</small>
			</div>
			<audio ref={audioRef} preload="metadata" src={src} />
		</div>
	);
};
