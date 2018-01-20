import * as React from 'react';
export default class MyComponent extends React.Component<{
        foo: string;
    }, {
    }> {
    static propTypes = {
        foo: React.PropTypes.string.isRequired,
    };
    render() {
        return <div />;
    }
}
