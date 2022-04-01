import React from 'react';
import {
  Button,
  Tag,
  NavBar,
  Icon,
  InputItem,
  SearchBar,
  Result,
} from 'antd-mobile';
import Sortable from 'react-sortablejs';
import _ from 'loadsh';
import {
  indexToArray,
  UpdateItem,
  isPathorCom,
  getDragItem,
  itemAdd,
  itemRemove,
  findItemObject,
  isTemporCom,
  findTempCode,
} from '../utils/utils';
import componetList from '../pages/config';
import { connect } from 'dva';
import './drag.less';

const sortableOption = {
  animation: 150,
  fallbackOnBody: true,
  swapThreshold: 0.65,
  group: {
    name: 'formItem',
    pull: true,
    put: true,
  },
};

const comData = [
  {
    type: 'div',
    nested: true,
    props: {
      style: {
        border: '1px solid red',
      },
    },
    children: [],
  },
];
const GlobalComponent = {
  Button,
  Tag,
  NavBar,
  Icon,
  InputItem,
  SearchBar,
  Result,
};

const renderReactDom = ({antd, componentName, props}) => {
  if(antd) {
    const Comp = GlobalComponent[componentName];
    return (
      React.createElement(
        Comp,
        props
      )
    )
  }
}

const DragCanvas = props => {
  const { dispatch, currentPageView, pageSelectIndex, templateList, isPage, currentComponentView,componentSelectIndex } = props;
  // useEffect(() => {
  //   dispatch({
  //     type: 'drag/setCurrentView',
  //     payload
  //   })
  // }, [currentView])
  const currentView = isPage ? currentPageView : currentComponentView;
  const selectIndex = isPage ? pageSelectIndex : componentSelectIndex;

  // 拖拽的排序方法,同级拖拽通过update
  const onUpdate = evt => {
    // 交换数组
    const { newIndex, oldIndex } = evt;
    // 父节点路径
    const parentPath = evt.path[1].getAttribute('data-id');
    const oldData = _.cloneDeep(currentView);
    const newData = UpdateItem(newIndex, oldIndex, oldData, parentPath);
    dispatch({
      type: 'drag/setCurrentView',
      payload: newData,
      isPage,
    });
  };

  const onAddItem = evt => {
    const startIndex = evt.newIndex;
    const comNameOrPath = evt.clone.dataset.id; // (1)得到拖拽元素或者路径
    const parentPath = evt.path[1].getAttribute('data-id');
    const newIndex = parentPath ? `${parentPath}-${startIndex}` : startIndex;
    const oldData = _.cloneDeep(currentView);
    if (isPathorCom(comNameOrPath)) {
      // 跨级拖拽, 需要考虑先删除元素还是先添加元素
      const oldIndex = comNameOrPath;
      const dragItem = getDragItem(oldIndex, oldData);
      if (indexToArray(oldIndex) < indexToArray(newIndex)) {
        // 先加后删
        let newTreeData = itemAdd(newIndex, oldData, dragItem);
        let newTreeData2 = itemRemove(oldIndex, newTreeData);

        dispatch({
          type: 'drag/setCurrentView',
          payload: newTreeData2,
          isPage,
        });
        return;
      }
      // 先删后加
      let newData = itemRemove(oldIndex, oldData);
      newData = itemAdd(newIndex, newData, dragItem);

      dispatch({
        type: 'drag/setCurrentView',
        payload: newData,
        isPage,
      });
      return;
    }
    if (isTemporCom(comNameOrPath)) {
      // 拿到com-后面的com 然后再查找对应的位置，然后插入代码
      const temName = comNameOrPath.split('com-')[1];
      // findTempCode
      const tempObj = findTempCode(templateList, temName);
      const newData = itemAdd(newIndex, oldData, tempObj);

      // 修改currentview
      dispatch({
        type: 'drag/setCurrentView',
        payload: newData,
        isPage,
      });
      return;
    }
    const componetFromList = findItemObject(componetList, comNameOrPath);
    const newData = itemAdd(newIndex, oldData, componetFromList);

    // 修改currentview
    dispatch({
      type: 'drag/setCurrentView',
      payload: newData,
      isPage,
    });
  };

  /**
   * @description 点击时把config，info等属性保存到state里。
   */
  const onChoose = evt => {
    let parent = evt.target;
    while (parent.getAttribute('data-id') == null) {
      parent = parent.parentNode;
    }
    const arrIndex =
      evt.target.getAttribute('data-id') || parent.getAttribute('data-id');
    const dragItem = getDragItem(arrIndex, _.clone(currentView));
    let info = {},
      reactNodeInfo = {};
    info = dragItem.props;
    reactNodeInfo = dragItem.nodeProps;
    const componetFromList = findItemObject(componetList, dragItem.type);
    const config = componetFromList.config;
    const reactNodeConfig = componetFromList.reactNodeConfig;

    // dispatch 存drag相关的payload
    const payload = {
      dragItem,
      arrIndex,
      propsInfo: info,
      propsConfig: config,
      nodePropsInfo: reactNodeInfo,
      nodePropsConfig: reactNodeConfig,
    };

    // 提交config
    dispatch({
      type: 'drag/setConfig',
      payload,
      isPage,
    });
  };

  const renderView = (data, index) => {
    return data.map((item, i) => {
      // index
      const indexs = index === '' ? String(i) : `${index}-${i}`;

      // 选中时的class
      let isSelectClass = {
        border: '1px dashed red',
      };
      const isSelect = indexs === selectIndex ? isSelectClass : {};
      let selectClass = indexs === selectIndex ? 'selectDrag' : 'unselectDrag';
      // 渲染，有子元素的嵌套的
      if (item.children) {
        let { props: style = {} } = item;
        let draggable = {
          // border: '1px dashed black',
        };
        let mergestyle = Object.assign({}, style.style, draggable, isSelect);
        let divprops = {
          style: mergestyle,
          'data-id': indexs,
          key: _.uniqueId()
        }
        if (selectClass) {
          divprops = {
            ...divprops,
            className: selectClass,
          }
        }
        return (
          React.createElement(
            'div',
            divprops,
            <Sortable
              style={{
                minHeight: 50,
                // margin: 10,
              }}
              key={_.uniqueId()}
              // ref={c => c && (sortable = c.sortable)}
              options={{
                ...sortableOption,
                onAdd: evt => onAddItem(evt),
                onUpdate: evt => onUpdate(evt),
              }}
            >
                {
              item.children.length > 0
                ? renderView(item.children, indexs)
                : null}
            </Sortable>,
          )
        );
      }
      const Comp = GlobalComponent[item.type];
      // 具有特殊属性(ReactNode)
      let ReactNodeProps = {};
      if (item.nodeProps) {
        const nodeProps = item.nodeProps;
        for (const key in nodeProps) {
          var func = eval('('+nodeProps[key].renderFunc+')');
          const params = nodeProps[key].params;
          const reactDomParmas = func(params);
          const domContent = renderReactDom(reactDomParmas);
          ReactNodeProps[key] = domContent;
        }
      }
      let props = {
        'data-id': indexs,
        key: _.uniqueId(),
        ...item.props,
        ...ReactNodeProps,
      };
      if (selectClass) {
        props = {
          ...props,
          className: selectClass,
        };
      }
      if (item.needDiv == true) {
        let draggable = {
          // border: '1px dashed blue',
        };
        let mergestyle = Object.assign({}, draggable, isSelect);
        return (
          <div data-id={indexs} style={mergestyle} key={_.uniqueId()}>
            {React.createElement(
              Comp,
              props,
              item.props.content ? item.props.content : null,
            )}
          </div>
        );
      } else {
        let borderStyle = isSelect.border || '';
        let cloneProps = _.cloneDeep(props);
        let MergeProps = _.merge(cloneProps, {
          style: {
            border: borderStyle,
          },
        });

        return React.createElement(
          Comp,
          MergeProps,
          item.props.content ? item.props.content : null,
        );
      }
    });
  };

  return (
    <div
      style={{
        width: '375px',
        height: '667px',
        backgroundColor: 'white',
        margin: '20px',
      }}
      className="dragContainer"
    >
      <Sortable
        options={{
          ...sortableOption,
          onAdd: evt => onAddItem(evt),
          onUpdate: evt => onUpdate(evt),
        }}
        onClick={evt => onChoose(evt)}
        key={_.uniqueId()}
      >
        {renderView(currentView, '')}
      </Sortable>
    </div>
  );
};

export default connect(({ drag }) => ({
  currentPageView: drag.currentView,
  pageSelectIndex: drag.config.arrIndex,
  templateList: drag.templateList,
  currentComponentView: drag.componentView,
  componentSelectIndex: drag.componentConfig.arrIndex,
}))(DragCanvas);
