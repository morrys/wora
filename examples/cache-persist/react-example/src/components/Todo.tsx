import * as React from 'react';
import styled from 'styled-components';

const StyledTodo = styled.li`
    color: #333;
    background-color: rgba(255, 255, 255, .5);
    padding: 15px;
    margin-bottom: 15px;
    border-radius: 5px;
    list-style: none;
    :hover {
        background-color: pink;
        cursor: pointer;
    }
`;

interface Props {
    item: {key: string, value: object},
    deleteItem: (key: string) => void
}

const Todo = (props: Props) => {
    
    const { item, deleteItem } = props;

    const handleOnClick = () => {
        deleteItem(item.key)
      }

    return <StyledTodo key={item.key} onClick={handleOnClick}>
        {item.value}
    </StyledTodo>
}

export default Todo