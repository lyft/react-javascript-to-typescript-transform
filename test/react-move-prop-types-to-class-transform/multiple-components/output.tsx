class SomeComponent extends React.Component<{
        foo: number;
    }, {
        bar: string;
    }> {
    static propTypes = { foo: React.PropTypes.string };
    render() {
        return null;
    }
}
SomeComponent.propTypes = { foo: React.PropTypes.string };
class AnotherComponent extends React.Component<{
        baz: number;
    }> {
    static propTypes = { baz: React.PropTypes.string };
    render() {
        return null;
    }
}
AnotherComponent.propTypes = { baz: React.PropTypes.string };
