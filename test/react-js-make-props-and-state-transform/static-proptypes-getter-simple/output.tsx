import * as React from 'react';
export default class MyComponent extends React.Component<{
        foo: string;
    }, {
    }> {
    static get propTypes() {
        return {
            foo: React.PropTypes.string.isRequired,
        };
    }
    render() {
        return <div />;
    }
}
