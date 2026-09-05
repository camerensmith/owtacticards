export default function ArmorCounter(props) {
    const armor = props.armor;
    const type = props.type;

    return (
        <div className={`armorcounter counter ${type}`}>
            <span className='armorvalue'>{armor}</span>
        </div>
    );
}
