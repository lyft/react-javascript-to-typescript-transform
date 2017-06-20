import * as React from 'react';

export default class MyComponent extends React.Component {
    render() {
        return <button onClick={this.onclick.bind(this)} />;
    }

    onclick() {
        if (Math.random() > 0.5) {
            this.setState({foo: 1, bar: 2})
        }
        this.otherMethod()
    }

    otherMethod() {
        for (const foo of [1,2,3]) {
            if (foo > 2) {
                this.setState({baz: foo})
            }
        }
    }

    addLargeObjectToState() {
        this.setState({
            something: {
                big: 123,
                here: 'string',
                of: [{a: 1}, {a: 2}]
            }
        })
    }
}