class SomeComponent extends React.Component<{
        foo: number;
    }, {
        bar: string;
    }> {
}
SomeComponent.propTypes = { foo: React.PropTypes.string };
SomeComponent.propTypes.baz = React.PropTypes.string.isRequired;