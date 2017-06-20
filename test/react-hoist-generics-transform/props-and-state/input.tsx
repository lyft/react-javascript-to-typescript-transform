import * as React from 'react';

export default class MyComponent extends React.Component<{foo: string; bar: object;}, {baz: string; [k: string]: string}> {
    render() {
        return <div />;
    }
}
