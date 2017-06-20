import * as React from 'react';

export default class MyComponent extends React.Component {
    state = {foo: 1, bar: 'str'};
    render() {
        return <div />;
    }
    otherFn() {
        this.setState({dynamicState: 42});
    }
}

MyComponent.propTypes = {
    baz: React.PropTypes.string.isRequired,
}
