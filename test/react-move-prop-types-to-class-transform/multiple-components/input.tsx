class SomeComponent extends React.Component<{
        foo: number;
    }, {
        bar: string;
    }> {
    render() {
        return null;
    }
}
SomeComponent.propTypes = { foo: React.PropTypes.string };

class AnotherComponent extends React.Component<{
    baz: number;
}> {
    render() {
        return null;
    }
}
AnotherComponent.propTypes = { baz: React.PropTypes.string };
