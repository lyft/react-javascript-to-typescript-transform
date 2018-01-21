class SomeComponent extends React.Component<{
        foo: string;
        baz: string;
    }, {
        bar: string;
    }> {
}
SomeComponent.propTypes = { foo: React.PropTypes.string };
SomeComponent.propTypes.baz = React.PropTypes.string.isRequired;


class AnotherComponent extends React.Component<{
        lol: number;
    }> {
}
AnotherComponent.propTypes = { lol: React.PropTypes.number };
