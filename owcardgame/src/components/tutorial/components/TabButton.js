import $ from 'jquery';

function TabButton(props) {

    function switchTutorialTab() {
        $('.tutorial-content').hide();
        $(`#${props.tabId}`).show();
    }

    return (
        <div
            className='tutorial-tab'
            onClick={switchTutorialTab}
        >
            <i className={`fas ${props.icon}`}></i>
            {props.title}
        </div>
    );
}

export default TabButton;