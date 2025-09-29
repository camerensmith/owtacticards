import { otherImages } from '../../assets/imageImports';
import AudioPlayer from './AudioPlayer';

export default function TitleCard(props) {
    function toggleTutorial() {
        document.getElementById('tutorial-container').classList.toggle('open');
    }

    return (
        <div id='title-container'>
            <div className='title-corners'>
                <i onClick={toggleTutorial} className='fas fa-question'></i>
            </div>
            <span className='title'>Overwatch</span>
            <img src={otherImages.owlogo} id='centerlogo' alt='owlogo' />
            <span className='title'>Tacticards</span>
            <AudioPlayer
                playAudio={props.playAudio}
                setPlayAudio={props.setPlayAudio}
            />
        </div>
    );
}
