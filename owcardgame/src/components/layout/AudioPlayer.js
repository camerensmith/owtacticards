import React, { useEffect, useState } from 'react';
import { otherImages } from '../../assets/imageImports';

export default function AudioPlayer(props) {
    const { playAudio, setPlayAudio } = props;
    const [volume, setVolume] = useState(0.3);
    const [showVolumeControl, setShowVolumeControl] = useState(false);

    useEffect(() => {
        const audio = document.getElementById('backgroundaudio');
        audio.volume = volume;
        playAudio ? audio.play() : audio.pause();
    }, [playAudio, volume]);

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
    };

    return (
        <div className='title-corners'>
            <div className='audio-controls'>
                {playAudio ? (
                    <i
                        onClick={() => {
                            setPlayAudio(!playAudio);
                        }}
                        className='fas fa-volume-up'
                        id='audioicon'
                        alt='audio icon'
                    />
                ) : (
                    <i
                        onClick={() => {
                            setPlayAudio(!playAudio);
                        }}
                        className='fas fa-volume-mute'
                        id='audioicon'
                        alt='audio icon'
                    />
                )}
                <i
                    onClick={() => setShowVolumeControl(!showVolumeControl)}
                    className='fas fa-sliders-h'
                    id='volumeicon'
                    alt='volume control'
                    style={{ marginLeft: '8px', cursor: 'pointer' }}
                />
                {showVolumeControl && (
                    <div className='volume-slider-container'>
                        <input
                            type='range'
                            min='0'
                            max='1'
                            step='0.1'
                            value={volume}
                            onChange={handleVolumeChange}
                            className='volume-slider'
                        />
                        <span className='volume-value'>{Math.round(volume * 100)}%</span>
                    </div>
                )}
            </div>
            <audio
                src={otherImages.overwatchTheme}
                type='audio/mpeg'
                loop={true}
                id='backgroundaudio'
            />
        </div>
    );
}
